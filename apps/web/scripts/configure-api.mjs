import { readFileSync, writeFileSync } from 'node:fs';

const path = 'public/ktob-config.json';
const existing = JSON.parse(readFileSync(path, 'utf8'));
const raw = process.env.KTOB_API_URL;
let apiBaseUrl = existing.apiBaseUrl;
if (raw) {
  const base = raw.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^\s]+\/api\/v1$/.test(base) &&
      !/^http:\/\/localhost:\d+\/api\/v1$/.test(base)) {
    throw new Error('KTOB_API_URL must be an HTTPS /api/v1 endpoint or localhost');
  }
  apiBaseUrl = base;
}

const supabaseUrl = process.env.SUPABASE_URL || existing.supabaseUrl || '';
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || existing.supabasePublishableKey || '';
if (supabaseUrl && !/^https:\/\/[^\s]+\.supabase\.co$/.test(supabaseUrl)) {
  throw new Error('SUPABASE_URL must be a valid Supabase HTTPS project origin');
}
if (supabasePublishableKey && !supabasePublishableKey.startsWith('sb_publishable_')) {
  throw new Error('Only a Supabase public publishable key may be embedded in the browser');
}
if (Boolean(supabaseUrl) !== Boolean(supabasePublishableKey)) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required together');
}
writeFileSync(path, JSON.stringify({ apiBaseUrl, supabaseUrl, supabasePublishableKey }, null, 2) + '\n');
console.log('Public runtime configuration updated. No secret credentials written.');
