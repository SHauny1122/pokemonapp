# Supabase Integration Notes

This project is scaffolded for Supabase-first backend work:

- Auth: Supabase Auth (email + social later)
- Database: Postgres (collection, cards, pricing snapshots, subscriptions)
- Storage: user upload images for card scan flow

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Current status:

- Browser client factory added in `client.ts`
- MVP screens still use mock data while scan/value APIs are not integrated
