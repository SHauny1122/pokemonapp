# Provider Strategy (Play Store Readiness)

This note defines data-provider boundaries for Smart Collector before commercial launch.

## Current Production Direction

- **Primary card catalog provider:** Pokemon TCG API
  - Card identity, card metadata, and set metadata should come from one primary catalog provider.
- **Current image source:** Pokemon TCG API image URLs
  - Card images are currently rendered from external URLs provided by the catalog API.
- **Current live pricing source:** TCGplayer and Cardmarket fields exposed through Pokemon TCG API card payloads.
- **Current fallback behavior:** Mock/demo fallback remains enabled for resilience in catalog flows.

## Provider Boundary Model

Keep provider responsibilities explicit and separated:

1. **Card catalog provider**
   - Canonical card identity, set identity, print metadata.
2. **Image provider**
   - Card image URLs/assets and image policy constraints.
3. **Live pricing provider**
   - Current market snapshots (market/low/mid/high/buylist where available).
4. **Sold-history/trend provider**
   - Sold/completed sales history, activity velocity, and trend signals from real sales data.

UI and scoring layers should consume normalized internal models from `CardService` and avoid direct provider-specific calls.

## Future Paid Provider Options

- **TCGplayer direct API**
  - Candidate source for richer direct pricing coverage.
- **PriceCharting API**
  - Candidate source for sold-history/time-series and trend context.
- **eBay sold/completed listings**
  - Candidate source for real-world sold comps and liquidity context.

These are additive provider candidates and should be integrated behind existing service/adapters, not directly in screens.

## Commercial / Compliance Warning

Before Play Store or commercial launch, verify all terms and rights for:

- Catalog data usage
- Card image hosting/hotlinking/display rights
- Pricing data redistribution rights
- Attribution, branding, and trademark requirements

Do not assume development-time usage rights automatically allow commercial distribution.
