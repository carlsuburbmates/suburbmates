import assert from 'node:assert/strict';
import fs from 'node:fs';

const disabledFunctions = [
  'supabase/functions/generate-bio/index.ts',
  'supabase/functions/compress-logo/index.ts',
];

const privilegedPatterns = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'createClient(',
  '.storage',
  '.from(\'vendors\')',
  '.from("vendors")',
];

for (const file of disabledFunctions) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /status:\s*410/, `${file} must remain an explicit 410 tombstone.`);
  for (const pattern of privilegedPatterns) {
    assert(!source.includes(pattern), `${file} must not contain dormant privileged capability: ${pattern}`);
  }
}

console.log('Disabled Edge Function tombstones contain no privileged database or storage capability.');
