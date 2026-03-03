import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

export interface PunchTransitionOptions {
  duration?: number;
}

export const usePunchTransition = <T>(
  value: T | Accessor<T>,
  { duration = 200 }: PunchTransitionOptions = {},
) => {
  const readValue: Accessor<T>
    = typeof value === "function" ? (value as Accessor<T>) : () => value;
  const initialValue = readValue();
  const [current, setCurrent] = createSignal<T>(initialValue);
  const [previous, setPrevious] = createSignal<T | undefined>(undefined);
  let timeoutRef: ReturnType<typeof setTimeout> | undefined;
  let lastValueRef = initialValue;

  createEffect(() => {
    const nextValue = readValue();

    if (Object.is(nextValue, lastValueRef)) return;

    if (timeoutRef) {
      globalThis.clearTimeout(timeoutRef);
    }

    setPrevious(() => lastValueRef);
    setCurrent(() => nextValue);
    lastValueRef = nextValue;

    timeoutRef = globalThis.setTimeout(() => {
      setPrevious(() => undefined);
      timeoutRef = undefined;
    }, duration);

    onCleanup(() => {
      if (timeoutRef) {
        globalThis.clearTimeout(timeoutRef);
      }
    });
  });

  return {
    current,
    previous,
    isTransitioning: () => previous() !== undefined,
  };
};
