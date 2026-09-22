/*
  NEITH AUTH CONFIG — SUPABASE PRODUCTION

  Public browser configuration only.
  The publishable key is designed to be shipped in frontend code.

  NEVER place service_role, sb_secret_*, SMTP credentials,
  Lemon Squeezy secrets or other server-side secrets here.
*/
window.NEITH_CONFIG = Object.freeze({
  supabaseUrl: 'https://nsqhfbyxqcmdthvptuzp.supabase.co',
  supabaseAnonKey: 'sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg',
  siteUrl: 'https://neithlauncher.com',
  oauthEnabled: true
});
