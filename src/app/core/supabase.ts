import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { isDemoMode } from './demo-mode';

/** Leerer Speicher für den Demo-Modus: keine Sitzung → keine Verbindung zu Supabase. */
const noStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const demo = isDemoMode();

/** Eine einzige Supabase-Verbindung für die ganze App. Die Sitzung bleibt im Browser gespeichert. */
export const supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
  auth: {
    persistSession: !demo,
    autoRefreshToken: !demo,
    detectSessionInUrl: false,
    storageKey: 'spontis-auth',
    ...(demo ? { storage: noStorage } : {}),
  },
});
