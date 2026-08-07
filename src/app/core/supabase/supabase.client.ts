import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from '../database/database.types';

export const supabase = createClient<Database>(
  environment.supabaseUrl,
  environment.supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);
