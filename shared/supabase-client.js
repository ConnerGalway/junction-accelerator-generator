const SUPABASE_URL      = 'https://weyugmllkettrshtrmug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndleXVnbWxsa2V0dHJzaHRybXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNjEzNzQsImV4cCI6MjA5NTkzNzM3NH0.Fj1Tg7LCqoEJ0mWeA18OsOniE-1imt3ZxEJnBtmr3ag';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true
  }
});
