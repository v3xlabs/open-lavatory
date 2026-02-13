import { useEffect, useRef, useState } from "preact/hooks";

export interface PunchTransitionOptions {
  duration?: number;
}

export const usePunchTransition = <T>(
  value: T,
  { duration = 200 }: PunchTransitionOptions = {},
) => {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<T | null>(null);
  const timeoutRef = useRef<number>();
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (Object.is(value, lastValueRef.current)) return;

    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
    }

    setPrevious(lastValueRef.current);
    setCurrent(value);
    lastValueRef.current = value;

    timeoutRef.current = globalThis.setTimeout(() => {
      setPrevious(null);
      timeoutRef.current = undefined;
    }, duration);

    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, [value, duration]);

  return {
    current,
    previous,
    isTransitioning: previous !== null,
  };
};
