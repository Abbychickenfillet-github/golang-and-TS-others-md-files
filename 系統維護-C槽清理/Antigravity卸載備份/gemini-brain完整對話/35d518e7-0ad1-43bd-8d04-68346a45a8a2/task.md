# Task: Investigate Booth Off-shelf & Pricing Consequences

- [x] Analyze `Order` and `BoothOrderSubscription` models to see if price is snapshotted. <!-- id: 0 -->
    - Found `BoothPriceSnapshot` in `BoothOrderSubscription`.
    - Need to confirm `OrderItem` also stores price.
- [ ] Analyze `EventBoothTypePricing` update/delete logic to see how it handles overlaps. <!-- id: 1 -->
- [ ] Determine "Off-shelf" behavior (IsActive=false vs Delete) and its effect on `GetBoothPrice`. <!-- id: 2 -->
- [ ] synthesizing findings to answer user's question about consequences. <!-- id: 3 -->
- [ ] Check `EventBoothTypePricing` date overlap logic. <!-- id: 4 -->
