# Task: Modularize main.go Routes

- [ ] Create `internal/router` directory <!-- id: 0 -->
- [ ] Create `internal/router/router.go` to define the main `SetupRoutes` function and `AppRouter` struct (or similar container). <!-- id: 1 -->
- [ ] Extract `setupUserRoutes` from `main.go` to `internal/router/user_routes.go`. <!-- id: 2 -->
- [ ] Extract `setupMemberRoutes` from `main.go` to `internal/router/member_routes.go`. <!-- id: 3 -->
- [ ] (Optional) Extract other route groups (Company, Event, etc.) similarly if the user approves the pattern. <!-- id: 4 -->
- [ ] Update `main.go` to use the new `internal/router` package for route registration. <!-- id: 5 -->
- [ ] Verify the application builds (or at least the code structure is correct). <!-- id: 6 -->
