/*
  NEITH AUTH CONFIG
  Public browser configuration only. The Supabase anon key is designed to be public.
  NEVER place your Supabase service-role key or Stripe secret key in this file.
*/
window.NEITH_CONFIG = Object.freeze({
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  siteUrl: window.location.origin
});
