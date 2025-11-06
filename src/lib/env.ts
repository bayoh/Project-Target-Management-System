import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
});

// During build time, environment variables might not be available
// Use safeParse to avoid throwing errors during build, but validate at runtime
const envResult = envSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

if (!envResult.success) {
  // In development, throw immediately to catch configuration issues early
  if (import.meta.env.DEV) {
    throw new Error(
      `Environment variable validation failed:\n${JSON.stringify(envResult.error.format(), null, 2)}\n\nPlease ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.`
    );
  }
  
  // In production build, warn but don't fail (allows build to complete)
  // Runtime validation will catch missing env vars when the app loads
  console.warn(
    '⚠️ Environment variables validation failed during build. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Netlify environment variables. ' +
    'The app will fail at runtime if these are missing.'
  );
}

export const env = envResult.success 
  ? envResult.data 
  : {
      // Provide defaults that will fail gracefully at runtime
      // These will be empty strings if env vars aren't set, causing Supabase client to fail with clear errors
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };

