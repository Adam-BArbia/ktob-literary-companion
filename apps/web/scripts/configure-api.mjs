import { writeFileSync } from 'node:fs';

const raw = process.env.KTOB_API_URL;
if (!raw) {
  console.log('Using committed local runtime config; KTOB_API_URL is not set.');
  process.exit(0);
}
const base = raw.trim().replace(/\/+$/, '');
if (!/^https:\/\/[^\s]+\/api\/v1$/.test(base) && !/^http:\/\/localhost:\d+\/api\/v1$/.test(base)) {
  throw new Error('KTOB_API_URL must be an HTTPS /api/v1 endpoint or localhost for development');
}
writeFileSync('public/ktob-config.json', JSON.stringify({ apiBaseUrl: base }, null, 2) + '\n');
console.log('Runtime API origin configured (no secret values emitted).');
