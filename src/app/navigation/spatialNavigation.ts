import { init } from "@noriginmedia/norigin-spatial-navigation";

/**
 * Wires up arrow-key/D-pad focus movement across the whole app. This must run
 * before any `useFocusable()` component mounts and tries to register itself —
 * React runs effects child-first, so calling this from a `useEffect` in the
 * root component is too late (children mount and register before the root's
 * own effect fires). Importing this module has the init() call as a
 * side-effect, and ES module bodies run exactly once at import time, before
 * `createRoot(...).render()` is ever called — so importing it at the top of
 * the entry point guarantees the ordering.
 */
init({ distanceCalculationMethod: "center" });
