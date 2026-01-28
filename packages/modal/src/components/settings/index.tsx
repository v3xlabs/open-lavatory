import type { FC } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";

import { useNavigationStack } from "../../hooks/useNavigationStack.js";
import { TransitionContainer } from "../../ui/TransitionContainer.js";
import { LanguageSettings } from "./a11y/index.js";
import { ConnectionPreferences } from "./connection/index.js";
import { SignalingSettings } from "./connection/signaling.js";
import { TransportSettings } from "./connection/transport.js";

export type SettingsScreen = "main" | "signaling" | "transport";

export interface SettingsNavigationRef {
  goBack: () => void;
  isAtRoot: boolean;
}

export interface ModalSettingsProps {
  onTitleChange?: (titleKey: string) => void;
  navigationRef?: React.MutableRefObject<SettingsNavigationRef | null>;
}

const getSettingsTitleKey = (screen: SettingsScreen): string => {
  switch (screen) {
    case "main":
      return "settings.title";
    case "signaling":
      return "settings.signaling.title";
    case "transport":
      return "settings.transport.title";
  }
};

export const ModalSettings: FC<ModalSettingsProps> = ({
  onTitleChange,
  navigationRef,
}) => {
  const {
    screen,
    previousScreen,
    isTransitioning,
    navigate,
    goBack,
    isAtRoot,
  } = useNavigationStack<SettingsScreen>("main");

  // Expose navigation methods to parent via ref
  const internalRef = useRef<SettingsNavigationRef>({ goBack, isAtRoot });

  internalRef.current = { goBack, isAtRoot };

  useEffect(() => {
    if (navigationRef) {
      navigationRef.current = internalRef.current;
    }
  }, [navigationRef, goBack, isAtRoot]);

  // Notify parent of title changes
  useEffect(() => {
    onTitleChange?.(getSettingsTitleKey(screen));
  }, [screen, onTitleChange]);

  const renderScreen = (s: SettingsScreen) => {
    switch (s) {
      case "main":
        return (
          <>
            <ConnectionPreferences onNavigate={navigate} />
            <LanguageSettings />
          </>
        );
      case "signaling":
        return <SignalingSettings />;
      case "transport":
        return <TransportSettings />;
    }
  };

  return (
    <div className="px-4 pb-2">
      <TransitionContainer
        current={screen}
        previous={previousScreen}
        isTransitioning={isTransitioning}
        render={renderScreen}
      />
    </div>
  );
};
