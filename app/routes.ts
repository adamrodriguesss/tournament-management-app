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
  route("admin/events/:id/bracket", "routes/admin/bracket.tsx"),
  route("admin/events/:id/results", "routes/admin/judged-results.tsx"),
  route("event-manager", "routes/event-manager/dashboard.tsx"),
  route("dashboard/event-roster/:registrationId", "routes/event-roster.tsx"),
  route("dashboard/team/:teamId", "routes/team.tsx"),
  route("tournaments", "routes/public/tournaments.tsx"),
  route("tournaments/:id", "routes/public/tournament-detail.tsx"),
  route("tournaments/:id/events/:eventId", "routes/public/event-detail.tsx"),
] satisfies RouteConfig;
