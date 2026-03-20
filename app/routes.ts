import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("admin/dashboard", "routes/admin/dashboard.tsx"),
  route("admin/tournaments", "routes/admin/tournaments.tsx"),
  route("admin/tournaments/:id/teams", "routes/admin/teams.tsx"),
  route("admin/tournaments/:id/events", "routes/admin/events.tsx"),
  route("referee", "routes/referee/dashboard.tsx"),
  route("dashboard/event-roster/:registrationId", "routes/event-roster.tsx")
] satisfies RouteConfig;
