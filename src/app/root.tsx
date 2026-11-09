import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import { SITE_DESCRIPTION, SITE_NAME } from "./shared/site";
import "./styles/global.css";
import type { Route } from "./+types/root";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ece7de" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..800&display=swap",
  },
];

export const meta = () => [
  { title: SITE_NAME },
  { name: "description", content: SITE_DESCRIPTION },
];

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";
  return (
    <main
      style={{ display: "grid", placeContent: "center", height: "100dvh", textAlign: "center" }}
    >
      <h1>{message}</h1>
      <p>
        <a href="/">Back to the knots</a>
      </p>
    </main>
  );
}
