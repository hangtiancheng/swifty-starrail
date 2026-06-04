import "./main.css";

import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ErrorBoundary } from "./components/error-boundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>,
);
