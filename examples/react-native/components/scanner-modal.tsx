import { Ionicons } from "@expo/vector-icons";
import type { BarcodeScanningResult } from "expo-camera";
import * as React from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type ScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
};

export const ScannerModal = ({
  visible,
  onClose,
  onScanned,
}: ScannerModalProps) => {
  const [cameraPermissionGranted, setCameraPermissionGranted]
    = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | undefined>(
    undefined,
  );
  const [cameraModule, setCameraModule] = React.useState<
    undefined | typeof import("expo-camera")
  >(undefined);
  const [scanned, setScanned] = React.useState(false);

  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const mutedTextColor = useThemeColor({}, "mutedText");

  React.useEffect(() => {
    if (visible) {
      setScanned(false);
      setCameraError(undefined);
      void loadCamera();
    }
  }, [visible]);

  const loadCamera = async () => {
    if (Platform.OS === "web") {
      setCameraError("QR scanner is not available on web.");

      return;
    }

    try {
      const mod = (await import("expo-camera")) as typeof import("expo-camera");

      setCameraModule(mod);

      const res = await mod.Camera.requestCameraPermissionsAsync();

      if (!res.granted) {
        setCameraPermissionGranted(false);
        setCameraError("Camera permission denied.");

        return;
      }

      setCameraPermissionGranted(true);
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      setCameraPermissionGranted(false);
      setCameraError(msg);
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);
    const data = String(result.data ?? "").trim();

    if (data.length === 0) return;

    onScanned(data);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.scannerScreen, { backgroundColor }]}>
        <View style={[styles.scannerTopBar, { borderColor }]}>
          <ThemedText type="defaultSemiBold">Scan QR</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            onPress={onClose}
            style={({ pressed }) => [
              styles.scannerClose,
              { borderColor, backgroundColor: surfaceColor },
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Ionicons name="close" size={18} color={textColor} />
          </Pressable>
        </View>

        <View style={[styles.scannerFrame, { borderColor }]}>
          {cameraError
            ? (
                <View style={styles.scannerMessage}>
                  <ThemedText type="defaultSemiBold">
                    Scanner unavailable
                  </ThemedText>
                  <ThemedText
                    style={[styles.scannerMessageBody, { color: mutedTextColor }]}
                  >
                    {cameraError}
                  </ThemedText>
                  <ThemedText
                    style={[styles.scannerMessageBody, { color: mutedTextColor }]}
                  >
                    If you’re using a custom dev client, rebuild it after installing
                    expo-camera.
                  </ThemedText>
                </View>
              )
            : (!cameraModule || !cameraPermissionGranted
                ? (
                    <View style={styles.scannerMessage}>
                      <ThemedText
                        style={[styles.scannerMessageBody, { color: mutedTextColor }]}
                      >
                        Requesting camera…
                      </ThemedText>
                    </View>
                  )
                : (
                    (() => {
                      const CameraViewComponent = cameraModule.CameraView;

                      return (
                        <CameraViewComponent
                          style={styles.camera}
                          onBarcodeScanned={handleBarCodeScanned}
                          barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                          }}
                        />
                      );
                    })()
                  ))}
        </View>

        <ThemedText style={[styles.scannerHint, { color: mutedTextColor }]}>
          Point the camera at an openlv QR code.
        </ThemedText>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scannerScreen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  scannerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  scannerClose: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  scannerFrame: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  camera: {
    flex: 1,
  },
  scannerHint: {
    textAlign: "center",
  },
  scannerMessage: {
    flex: 1,
    padding: 16,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerMessageBody: {
    textAlign: "center",
  },
});
