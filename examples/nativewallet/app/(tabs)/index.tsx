import { Image } from 'expo-image';
import * as React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <ThemedText style={styles.buttonText}>{title}</ThemedText>
    </Pressable>
  );
};

export default function HomeScreen() {
  const [connectionUrl, setConnectionUrl] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('idle');
  const [logLines, setLogLines] = React.useState<string[]>([]);
  const [session, setSession] = React.useState<Session | null>(null);

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
        setStatus(state.status);
        appendLog(`state => ${state.status}`);
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
      setSessionUrl(null);
      setStatus('idle');
      appendLog('Closed.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendLog(`ERROR: ${msg}`);
    }
  }, [appendLog, session]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView>
        <ThemedText type="title">openlv</ThemedText>
        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
          Secure peer-to-peer JSON-RPC connectivity between dApps and wallets because the defacto way to connect your wallet should be private, transparent, and permissionless
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
          Session test (WebRTC + WebCrypto)
        </ThemedText>

        <ThemedText style={{ marginBottom: 6 }}>
          Paste an `openlv://...` URL (from the web “Try it out” page)
        </ThemedText>

        <TextInput
          value={connectionUrl}
          onChangeText={setConnectionUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder="openlv://..."
        />

        <View style={styles.row}>
          <Button
            title={session ? 'Session running' : 'Connect'}
            onPress={() => {
              void startSession();
            }}
            disabled={!!session}
          />
          <Button
            title="Close"
            onPress={() => {
              void closeSession();
            }}
            disabled={!session}
          />
        </View>

        <ThemedText style={{ marginTop: 10 }}>
          Status: {status}
        </ThemedText>

        <ThemedText style={{ marginTop: 10, marginBottom: 6 }}>
          Log
        </ThemedText>
        <View style={styles.logBox}>
          {logLines.length === 0 ? (
            <ThemedText style={styles.logLine}>No logs yet.</ThemedText>
          ) : (
            logLines.map((l, i) => (
              <ThemedText key={`${i}-${l}`} style={styles.logLine}>
                {l}
              </ThemedText>
            ))
          )}
        </View>
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
  input: {
    borderWidth: 1,
    borderColor: '#999',
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
    backgroundColor: '#1D3D47',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
  },
  logBox: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  logLine: {
    fontSize: 12,
  },
});
