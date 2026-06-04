import { createHashRouter, Navigate } from "react-router";
import { RootLayout } from "../pages/root-layout";

export const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/achievement" replace /> },
      {
        path: "achievement",
        lazy: () => import("../pages/achievement/achievement-page"),
      },
      {
        path: "gacha",
        lazy: () => import("../pages/gacha/gacha-page"),
      },
      {
        path: "setting",
        lazy: () => import("../pages/setting/setting-page"),
      },
    ],
  },
]);
