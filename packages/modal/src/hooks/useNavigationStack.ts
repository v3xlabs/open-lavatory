import type { Accessor } from "solid-js";
import { createMemo, createSignal } from "solid-js";

import { usePunchTransition } from "./usePunchTransition.js";

export interface UseNavigationStackOptions {
  transitionDuration?: number;
}

export interface UseNavigationStackReturn<T> {
  screen: Accessor<T>;
  previousScreen: Accessor<T | undefined>;
  isTransitioning: Accessor<boolean>;
  navigate: (screen: T) => void;
  goBack: () => void;
  isAtRoot: Accessor<boolean>;
}

export const useNavigationStack = <T>(
  initialScreen: T,
  { transitionDuration = 200 }: UseNavigationStackOptions = {},
): UseNavigationStackReturn<T> => {
  const [stack, setStack] = createSignal<T[]>([initialScreen]);
  const [index, setIndex] = createSignal(0);
  const screen = createMemo<T>(() => stack()[index()] ?? initialScreen);
  const { current, previous, isTransitioning } = usePunchTransition(screen, {
    duration: transitionDuration,
  });

  const navigate = (nextScreen: T) => {
    const activeIndex = index();
    const activeStack = stack();
    const currentScreen = activeStack[activeIndex];

    if (Object.is(currentScreen, nextScreen)) return;

    const nextStack = activeStack.slice(0, activeIndex + 1);

    nextStack.push(nextScreen);
    setStack(nextStack);
    setIndex(nextStack.length - 1);
  };

  const goBack = () => {
    setIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  return {
    screen: current,
    previousScreen: previous,
    isTransitioning,
    navigate,
    goBack,
    isAtRoot: () => index() === 0,
  };
};
