import { useCallback, useEffect, useRef, useState } from "react";
import { useData } from "../contexts/DataContext";

/** Simulasi loading + muat ulang data dari LocalStorage. */
export function useRefreshable(initialDelay = 350) {
  const { reload } = useData();
  const [loading, setLoading] = useState(true);
  const timer = useRef();

  useEffect(() => {
    timer.current = setTimeout(() => setLoading(false), initialDelay);
    return () => clearTimeout(timer.current);
  }, [initialDelay]);

  const refresh = useCallback(() => {
    setLoading(true);
    reload();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoading(false), 450);
  }, [reload]);

  return { loading, refresh };
}

export function useDebounced(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
