import type { ApiProxy } from "./index";

declare global {
  interface Window {
    api: ApiProxy;
  }
}
