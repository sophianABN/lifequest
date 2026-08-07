"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` pendant le rendu serveur, `true` côté client.
 *
 * Implémenté avec `useSyncExternalStore` plutôt qu'avec le duo
 * `useState(false)` + `useEffect(() => setMounted(true))` : le résultat est le
 * même, sans passe de rendu supplémentaire ni `setState` dans un effet.
 *
 * Utile pour tout ce qui n'existe pas sur le serveur — thème résolu,
 * préférences système, `window`.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
