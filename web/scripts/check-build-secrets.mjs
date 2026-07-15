import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const buildRoot = path.join(root, ".open-next");
const sensitiveNames = new Set([
  "DATABASE_URL",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TURNSTILE_SECRET_KEY",
  "REVALIDATION_TOKEN",
]);

if (!fs.existsSync(buildRoot)) {
  console.error("OpenNext build output is missing. Run the Cloudflare build first.");
  process.exit(1);
}

function envValues(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).flatMap((line) => {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) return [];
    const separator = line.indexOf("=");
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    value = value.replace(/^(['"])(.*)\1$/, "$2");
    return sensitiveNames.has(name) && value.length >= 8 ? [{ name, value }] : [];
  });
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(item) : [item];
  });
}

const knownSecrets = [
  ...envValues(path.resolve(root, "../.env.local")),
  ...envValues(path.resolve(root, ".env.local")),
];
const signatures = [
  { name: "Stripe secret key", pattern: /sk_(?:test|live)_[A-Za-z0-9_]{16,}/ },
  { name: "Stripe webhook secret", pattern: /whsec_[A-Za-z0-9_]{16,}/ },
  { name: "Resend API key", pattern: /\bre_[A-Za-z0-9]{24,}\b/ },
  { name: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{16,}/ },
  { name: "Database URL with credentials", pattern: /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/ },
];
const findings = new Set();

for (const file of walk(buildRoot)) {
  let contents;
  try {
    contents = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const secret of knownSecrets) {
    if (contents.includes(secret.value)) findings.add(`${secret.name} in ${path.relative(root, file)}`);
  }
  for (const signature of signatures) {
    if (signature.pattern.test(contents)) findings.add(`${signature.name} in ${path.relative(root, file)}`);
  }
}

if (findings.size > 0) {
  console.error("Sensitive values were found in the Cloudflare build:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Cloudflare build contains no known server secrets.");
