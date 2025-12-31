import { Image } from 'expo-image';
import * as React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

import {
  connectSession,
  type Session,
} from '@openlv/react-native-session';

const DUMMY_ADDRESS = '0x0000000000000000000000000000000000000001';
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
            return { result: [DUMMY_ADDRESS] };
          }

          if (req.method === 'personal_sign') {
            return { result: DUMMY_SIGNATURE };
          }

          return { result: 'ok' };
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

          <TextInput
            value={connectionUrl}
            onChangeText={setConnectionUrl}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
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
});
