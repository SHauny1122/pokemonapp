# Android Debug Path (Next.js + Capacitor)

This project keeps Next.js as the primary web codebase and uses Capacitor as a native Android shell for debug testing.

## Recommended Safe Mode (Now)

Use Capacitor with a live dev server URL instead of static export.

- Keep `npm run dev` for normal web development.
- Point Capacitor to your LAN URL via `CAP_SERVER_URL`.
- Do not switch Next.js to `output: "export"` yet.

Example LAN URL:

- `http://192.168.1.25:3000`

## Why this is safest for current app

The app uses Next.js features that are easier to keep working with a running server-based dev flow:

- App Router dynamic routes (for example card and set detail pages)
- runtime fetch/data behavior
- current web workflow with no feature rewrites

## Static export limitations to plan for later

If you eventually package fully offline web assets (`output: "export"`), Next.js docs list unsupported features such as:

- dynamic routes without static params
- request-dependent route handlers
- cookies, headers, rewrites, redirects, proxy
- default `next/image` optimization loader

So production packaging should be treated as a later phase once the app is audited for export compatibility.

## Minimal Capacitor commands

1. Install deps:
   - `npm install`
2. Build web app (sanity):
   - `npm run build`
3. Create Android project once:
   - `npx cap add android`
4. Sync changes:
   - `npm run cap:sync`
5. Open Android Studio:
   - `npm run cap:open`

## Debug on real Android phone

1. Start Next on LAN:
   - `npm run dev -- --hostname 0.0.0.0 --port 3000`
2. Set env for Capacitor server URL:
   - PowerShell: `$env:CAP_SERVER_URL="http://<your-lan-ip>:3000"`
3. Sync Capacitor config:
   - `npm run cap:sync`
4. Open/run Android app from Android Studio on device (USB debug or same-network).

Notes:

- Phone must reach your PC over LAN.
- For cleartext `http` debug, Capacitor config enables cleartext in this mode.
- Keep this debug mode separate from production Play Store hardening.
