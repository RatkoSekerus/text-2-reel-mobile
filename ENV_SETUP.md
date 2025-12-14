# Environment Setup

This mobile app requires Supabase environment variables to be configured.

## Required Environment Variables

You need to set the following environment variables:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Setup Options

### Option 1: Replace placeholders in `lib/supabase.ts` (Quick Start)

Edit `lib/supabase.ts` and replace the placeholder values:
- Replace `YOUR_SUPABASE_URL_HERE` with your actual Supabase URL
- Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual Supabase anon key

### Option 2: Using .env file (Recommended for production)

Create a `.env` file in the `Text2reel` directory:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Option 3: Using app.json

Edit `app.json` and replace the placeholder values in `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "your_supabase_url",
      "supabaseAnonKey": "your_supabase_anon_key"
    }
  }
}
```

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" for `EXPO_PUBLIC_SUPABASE_URL`
4. Copy the "anon public" key for `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Notes

- Make sure these values match the ones used in your web application
- Never commit your `.env` file or real credentials to version control
- Placeholder values are currently set in `lib/supabase.ts` and `app.json` - replace them with your actual credentials
- Priority order: `app.json` extra config → `.env` file → placeholders in code

