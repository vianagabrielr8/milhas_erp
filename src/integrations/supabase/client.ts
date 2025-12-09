import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Hardcoded para testar (Força Bruta)
const supabaseUrl = 'https://ywywlfxtaagfvvkeycsc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eXdsZnh0YWFnZnZ2a2V5Y3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDI5NDksImV4cCI6MjA4MDgxODk0OX0.psdAO12r2ein6PVZGYKDlFM1xqI5gFj22_cjmCvw-TU';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
