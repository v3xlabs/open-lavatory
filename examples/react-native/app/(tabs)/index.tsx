import { Image } from "expo-image";
import * as React from "react";
import { StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ScannerModal } from "@/components/scanner-modal";
import { SessionCard } from "@/components/session-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useWalletSession } from "@/hooks/use-wallet-session";

export default function HomeScreen() {
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const mutedTextColor = useThemeColor({}, "mutedText");

  const {
    connectionUrl,
    setConnectionUrl,
    status,
    logLines,
    session,
    startSession,
    closeSession,
  } = useWalletSession();

  const onScanned = React.useCallback(
    (data: string) => {
      setConnectionUrl(data);
      setScannerOpen(false);
    },
    [setConnectionUrl],
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{
        light: Colors.light.background,
        dark: Colors.dark.background,
      }}
      headerImage={(
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      )}
    >
      <ThemedView style={styles.page}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">openlv</ThemedText>
          <ThemedText style={{ color: mutedTextColor }}>
            Secure peer-to-peer JSON-RPC connectivity.
          </ThemedText>
        </ThemedView>

        <SessionCard
          connectionUrl={connectionUrl}
          setConnectionUrl={setConnectionUrl}
          onScanPress={() => setScannerOpen(true)}
          session={session}
          status={status}
          logLines={logLines}
          onConnect={() => void startSession()}
          onClose={() => void closeSession()}
        />

        <ScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanned={onScanned}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  page: {
    flex: 1,
    gap: 14,
    padding: 16,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
});
