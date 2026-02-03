import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@openlv/react-native";
import * as React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

type SessionCardProps = {
  connectionUrl: string;
  setConnectionUrl: (url: string) => void;
  onScanPress: () => void;
  session: Session | null;
  status: string;
  logLines: string[];
  onConnect: () => void;
  onClose: () => void;
};

export function SessionCard({
  connectionUrl,
  setConnectionUrl,
  onScanPress,
  session,
  status,
  logLines,
  onConnect,
  onClose,
}: SessionCardProps) {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const mutedTextColor = useThemeColor({}, "mutedText");
  const tintColor = useThemeColor({}, "tint");

  return (
    <ThemedView
      lightColor={Colors.light.surface}
      darkColor={Colors.dark.surface}
      style={[styles.card, { borderColor }]}
    >
      <ThemedText type="subtitle" style={styles.cardTitle}>
        Session test
      </ThemedText>

      <View style={styles.inputRow}>
        <TextInput
          value={connectionUrl}
          onChangeText={setConnectionUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            styles.inputFlex,
            {
              backgroundColor: surfaceColor,
              borderColor,
              color: textColor,
            },
          ]}
          placeholder="openlv://..."
          placeholderTextColor={mutedTextColor}
          selectionColor={tintColor}
          cursorColor={tintColor}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan QR code"
          onPress={onScanPress}
          style={({ pressed }) => [
            styles.qrButton,
            { borderColor, backgroundColor: surfaceColor },
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Ionicons name="qr-code-outline" size={20} color={tintColor} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <Button
          title={session ? "Session running" : "Connect"}
          onPress={onConnect}
          disabled={!!session}
          variant="primary"
          backgroundColor={tintColor}
          borderColor={tintColor}
          textColor={backgroundColor}
        />
        <Button
          title="Close"
          onPress={onClose}
          disabled={!session}
          variant="secondary"
          backgroundColor={surfaceColor}
          borderColor={borderColor}
          textColor={textColor}
        />
      </View>

      <ThemedText style={[styles.status, { color: mutedTextColor }]}>
        Status: <ThemedText type="defaultSemiBold">{status}</ThemedText>
      </ThemedText>

      <ThemedText type="defaultSemiBold" style={styles.logTitle}>
        Log
      </ThemedText>
      <View
        style={[styles.logBox, { borderColor, backgroundColor: surfaceColor }]}
      >
        {logLines.length === 0 ? (
          <ThemedText style={[styles.logLine, { color: mutedTextColor }]}>
            No logs yet.
          </ThemedText>
        ) : (
          logLines.map((l, i) => (
            <ThemedText key={`${i}-${l}`} style={styles.logLine}>
              {l}
            </ThemedText>
          ))
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  inputFlex: {
    flex: 1,
  },
  qrButton: {
    width: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  status: {
    marginTop: 4,
  },
  logTitle: {
    marginTop: 6,
  },
  logBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  logLine: {
    fontSize: 12,
  },
});
