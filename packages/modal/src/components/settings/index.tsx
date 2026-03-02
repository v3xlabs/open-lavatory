import { createEffect } from "solid-js";

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
  navigationRef?: { current: SettingsNavigationRef | null };
}

const getSettingsTitleKey = (screen: SettingsScreen): string => {
  switch (screen) {
    case "main": {
      return "settings.title";
    }
    case "signaling": {
      return "settings.signaling.title";
    }
    case "transport": {
      return "settings.transport.title";
    }
  }
};

export const ModalSettings = (props: ModalSettingsProps) => {
  const {
    screen,
    previousScreen,
    isTransitioning,
    navigate,
    goBack,
    isAtRoot,
  } = useNavigationStack<SettingsScreen>("main");

  const internalRef: SettingsNavigationRef = {
    goBack,
    get isAtRoot() {
      return isAtRoot();
    },
  };

  createEffect(() => {
    if (props.navigationRef) {
      props.navigationRef.current = internalRef;
    }
  });

  createEffect(() => {
    props.onTitleChange?.(getSettingsTitleKey(screen()));
  });

  const renderScreen = (s: SettingsScreen) => {
    switch (s) {
      case "main": {
        return (
          <>
            <ConnectionPreferences onNavigate={navigate} />
            <LanguageSettings />
          </>
        );
      }
      case "signaling": {
        return <SignalingSettings />;
      }
      case "transport": {
        return <TransportSettings />;
      }
    }
  };

  return (
    <div class="px-4 pb-2">
      <TransitionContainer
        current={screen()}
        previous={previousScreen()}
        isTransitioning={isTransitioning()}
        render={renderScreen}
      />
    </div>
  );
};
