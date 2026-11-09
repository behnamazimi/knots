import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("knots/:id", "routes/knot.tsx"),
  route("recorder", "routes/recorder.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
