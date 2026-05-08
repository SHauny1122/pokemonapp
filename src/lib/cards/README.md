# Cards Service Layer

This folder separates app screens from data source details.

- `api-card-service.ts` is the **active catalog adapter** for cards/sets/search.
  - It calls the public Pokemon TCG API directly.
  - It falls back to mock catalog data if API requests fail.
  - Card images are used directly from API URLs.
- `mock-card-service.ts` remains the **mock pricing/deal-check source**.
  - Deal Check and price summaries are intentionally mock-only for now.
- `card-service.ts` is the **public app-facing service layer**.
  - Screens and components should import from here.
  - It routes catalog reads to API adapter and price/deal-check to mock adapter.

## Future switch

When price APIs are ready, move `getPriceSummary` and `getDealCheck` in `card-service.ts`
from `mockCardService` to API-backed implementations.
