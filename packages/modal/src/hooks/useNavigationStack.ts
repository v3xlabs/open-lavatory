import { useCallback, useState } from "preact/hooks";

import { usePunchTransition } from "./usePunchTransition.js";

export interface UseNavigationStackOptions {
  transitionDuration?: number;
}

export interface UseNavigationStackReturn<T> {
  screen: T;
  previousScreen: T | null;
  isTransitioning: boolean;
  navigate: (screen: T) => void;
  goBack: () => void;
  isAtRoot: boolean;
}

export const useNavigationStack = <T>(
  initialScreen: T,
  { transitionDuration = 200 }: UseNavigationStackOptions = {},
): UseNavigationStackReturn<T> => {
  const [screen, setScreen] = useState<T>(initialScreen);
  const { current, previous, isTransitioning } = usePunchTransition(screen, {
    duration: transitionDuration,
  });

  const navigate = useCallback((nextScreen: T) => {
    setScreen(nextScreen);
  }, []);

  const goBack = useCallback(() => {
    setScreen(initialScreen);
  }, [initialScreen]);

  return {
    screen: current,
    previousScreen: previous,
    isTransitioning,
    navigate,
    goBack,
    isAtRoot: current === initialScreen,
  };
};
