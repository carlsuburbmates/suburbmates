const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED",
];

const missing = required.filter((name) => !process.env[name]?.trim());
const launch = process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED?.trim();

if (missing.length > 0) {
  console.error(`Cloudflare deployment is missing required public build configuration: ${missing.join(", ")}.`);
  process.exit(1);
}

if (launch !== "true" && launch !== "false") {
  console.error("NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED must be exactly true or false.");
  process.exit(1);
}

console.log("Cloudflare deployment has the required public build configuration.");
