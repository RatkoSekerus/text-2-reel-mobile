import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Replace these placeholder values with your actual Supabase credentials
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'YOUR_SUPABASE_URL_HERE';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

