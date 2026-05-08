# Data Provider Roadmap (Foundation Note)

Smart Collector currently uses mock + adapter services for catalog, pricing, and deal-check logic.

## Current State

- Card/set catalog flows through `src/lib/cards/card-service.ts`.
- Deal-check scoring logic is centralized in `src/lib/cards/deal-check-engine.ts`.
- Price/value displays rely on centralized currency formatting in `src/lib/currency`.

## Planned Real Data Integration

To avoid scattered API calls, all production integrations should continue through the card service layer.

1. **Card/Set Catalog**
   - Primary source: Pokemon TCG API
   - Adapter location: `src/lib/cards/api-card-service.ts`

2. **Pricing + Sold Market Data**
   - Planned sources: TCGplayer, PriceCharting, and/or eBay sold listings
   - Keep normalized sold-price snapshots in one model before scoring.

3. **Deal Check Inputs**
   - Should remain grounded in real sold prices, median sold, liquidity/activity, volatility, and demand.
   - Avoid predictive/fake-AI language and unsupported forecast fields.

## Implementation Guardrail

Any new external provider integration should be added via the existing `CardService` facade so UI layers remain stable.
