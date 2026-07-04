import "./main.css";

import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ReactErrorBoundary } from "@swifty.js/sentry/react";
import { ErrorFallback } from "./components/error-boundary";
import { init, enablePlugin } from "@swifty.js/sentry";
import {
  ScreenRecordPlugin,
  ExposurePlugin,
  PerformancePlugin,
} from "@swifty.js/sentry/plugins";

init({
  dsn: import.meta.env.DEV ? "/dev/sentry" : "ipc",
  beforePushEventList(eventList) {
    if (!import.meta.env.DEV) {
      window.api.send("sentry:log", eventList);
      return false;
    }
    return eventList;
  },
});

enablePlugin(new ScreenRecordPlugin());
enablePlugin(new ExposurePlugin());
enablePlugin(new PerformancePlugin());

createRoot(document.getElementById("root")!).render(
  <ReactErrorBoundary fallback={ErrorFallback}>
    <RouterProvider router={router} />
  </ReactErrorBoundary>,
);
