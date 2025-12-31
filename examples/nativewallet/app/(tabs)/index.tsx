import { Image } from 'expo-image';
import * as React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { BarcodeScanningResult } from 'expo-camera';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

import {
  connectSession,
  type Session,
} from '@openlv/react-native-session';

const DUMMY_ADDRESS = '0x8F8f07b6D61806Ec38febd15B07528dCF2903Ae7'.toLowerCase();
const DUMMY_SIGNATURE = (`0x${'11'.repeat(65)}`) as const;

const Button = ({
  title,
  onPress,
  disabled,
  variant = 'primary',
  backgroundColor,
  borderColor,
  textColor,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.buttonSecondary : null,
        { backgroundColor, borderColor },
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <ThemedText style={[styles.buttonText, { color: textColor }]}>{title}</ThemedText>
    </Pressable>
  );
};

export default function HomeScreen() {
  const [connectionUrl, setConnectionUrl] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('idle');
  const [logLines, setLogLines] = React.useState<string[]>([]);
  const [session, setSession] = React.useState<Session | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [scanned, setScanned] = React.useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameraModule, setCameraModule] = React.useState<null | typeof import('expo-camera')>(null);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const mutedTextColor = useThemeColor({}, 'mutedText');
  const tintColor = useThemeColor({}, 'tint');

  const appendLog = React.useCallback((line: string) => {
    setLogLines((prev) => [line, ...prev].slice(0, 50));
  }, []);

  const startSession = React.useCallback(async () => {
    try {
      if (!connectionUrl.trim()) {
        throw new Error('Missing connection URL');
      }

      setStatus('connecting');
      appendLog('Connecting…');

      const nextSession = await connectSession(
        connectionUrl.trim(),
        async (message) => {
          appendLog(`RPC <= ${JSON.stringify(message)}`);
          const req = message as { method?: string; params?: unknown };

          if (req.method === 'eth_accounts' || req.method === 'eth_requestAccounts') {
            return [DUMMY_ADDRESS];
          }

          if (req.method === 'personal_sign') {
            return DUMMY_SIGNATURE;
          }

          return 'ok';
        },
      );

      nextSession.emitter.on('state_change', (state) => {
        if (typeof state !== 'undefined') {
          appendLog(`session state => ${state.status}`);
          setStatus(`session: ${state.status}`);
        }
      });

      setSession(nextSession);

      await nextSession.connect();

      appendLog('Connected; waiting for link…');
      void nextSession.waitForLink().then(() => {
        appendLog('Linked! (transport should start)');
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendLog(`ERROR: ${msg}`);
      setStatus('error');
    }
  }, [appendLog, connectionUrl]);

  const closeSession = React.useCallback(async () => {
    try {
      if (!session) return;
      appendLog('Closing session…');
      await session.close();
      setSession(null);
      setStatus('idle');
      appendLog('Closed.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendLog(`ERROR: ${msg}`);
    }
  }, [appendLog, session]);

  const openScanner = React.useCallback(async () => {
    setScanned(false);
    setCameraError(null);

    if (Platform.OS === 'web') {
      appendLog('QR scanner is not available on web.');
      return;
    }

    setScannerOpen(true);

    try {
      const mod = (await import('expo-camera')) as typeof import('expo-camera');
      setCameraModule(mod);

      const res = await mod.Camera.requestCameraPermissionsAsync();
      if (!res.granted) {
        setCameraPermissionGranted(false);
        appendLog('Camera permission denied.');
        setCameraError('Camera permission denied.');
        return;
      }

      setCameraPermissionGranted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCameraPermissionGranted(false);
      setCameraError(msg);
      appendLog(`Camera unavailable: ${msg}`);
    }
  }, [appendLog]);

  const onScanned = React.useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      const data = String(result.data ?? '').trim();
      if (data.length === 0) return;

      setConnectionUrl(data);
      appendLog(`Scanned: ${data}`);
      setScannerOpen(false);
    },
    [appendLog, scanned],
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.background, dark: Colors.dark.background }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.page}>
        <ThemedText type="title" style={styles.title}>
          openlv
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: mutedTextColor }]}>
          Secure peer-to-peer JSON-RPC connectivity between dApps and wallets because the defacto way to connect your wallet should be private, transparent, and permissionless
        </ThemedText>

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
              onPress={() => {
                void openScanner();
              }}
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
              title={session ? 'Session running' : 'Connect'}
              onPress={() => {
                void startSession();
              }}
              disabled={!!session}
              variant="primary"
              backgroundColor={tintColor}
              borderColor={tintColor}
              textColor={backgroundColor}
            />
            <Button
              title="Close"
              onPress={() => {
                void closeSession();
              }}
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
          <View style={[styles.logBox, { borderColor, backgroundColor: surfaceColor }]}
          >
            {logLines.length === 0 ? (
              <ThemedText style={[styles.logLine, { color: mutedTextColor }]}>No logs yet.</ThemedText>
            ) : (
              logLines.map((l, i) => (
                <ThemedText key={`${i}-${l}`} style={styles.logLine}>
                  {l}
                </ThemedText>
              ))
            )}
          </View>
        </ThemedView>

        <Modal
          visible={scannerOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            setScannerOpen(false);
          }}
        >
          <ThemedView style={[styles.scannerScreen, { backgroundColor }]}
          >
            <View style={[styles.scannerTopBar, { borderColor }]}>
              <ThemedText type="defaultSemiBold">Scan QR</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close scanner"
                onPress={() => {
                  setScannerOpen(false);
                }}
                style={({ pressed }) => [
                  styles.scannerClose,
                  { borderColor, backgroundColor: surfaceColor },
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Ionicons name="close" size={18} color={textColor} />
              </Pressable>
            </View>

            <View style={[styles.scannerFrame, { borderColor }]}>
              {cameraError ? (
                <View style={styles.scannerMessage}>
                  <ThemedText type="defaultSemiBold">Scanner unavailable</ThemedText>
                  <ThemedText style={[styles.scannerMessageBody, { color: mutedTextColor }]}>
                    {cameraError}
                  </ThemedText>
                  <ThemedText style={[styles.scannerMessageBody, { color: mutedTextColor }]}>
                    If you’re using a custom dev client, rebuild it after installing expo-camera.
                  </ThemedText>
                </View>
              ) : !cameraModule || !cameraPermissionGranted ? (
                <View style={styles.scannerMessage}>
                  <ThemedText style={[styles.scannerMessageBody, { color: mutedTextColor }]}>
                    Requesting camera…
                  </ThemedText>
                </View>
              ) : (
                (() => {
                  const CameraViewComponent = cameraModule.CameraView;
                  return (
                    <CameraViewComponent
                      style={styles.camera}
                      onBarcodeScanned={onScanned}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    />
                  );
                })()
              )}
            </View>

            <ThemedText style={[styles.scannerHint, { color: mutedTextColor }]}>
              Point the camera at an openlv QR code.
            </ThemedText>
          </ThemedView>
        </Modal>
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
    position: 'absolute',
  },
  page: {
    flex: 1,
    gap: 14,
  },
  title: {
    letterSpacing: 0.2,
  },
  tagline: {
    marginTop: -6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    marginBottom: 2,
  },
  cardSubtitle: {
    marginTop: -8,
    marginBottom: 6,
  },
  helper: {
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  inputFlex: {
    flex: 1,
  },
  qrButton: {
    width: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: '600',
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
  scannerScreen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  scannerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  scannerClose: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  camera: {
    flex: 1,
  },
  scannerHint: {
    textAlign: 'center',
  },
  scannerMessage: {
    flex: 1,
    padding: 16,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerMessageBody: {
    textAlign: 'center',
  },
});
