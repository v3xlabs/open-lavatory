import type { Component } from 'solid-js'
import { createSignal, onMount, Show } from 'solid-js'
import styles from './App.module.css'
import { QRScanner } from './components/QRScanner'
import { config } from '../lib/wagmi'
import { useWalletBalance } from '../lib/useBalance'
import { formatEther } from 'viem'
import { ANVIL_ACCOUNT_0 } from '../lib/const'

const App: Component = () => {
  const [show, setShow] = createSignal(false)

  const balance = useWalletBalance(config, ANVIL_ACCOUNT_0)

  return (
    <main class={styles.main}>
      <h1>"Mobile" App</h1>
      <div>
        <h2>Balance: {formatEther(balance())} ETH</h2>
        <h2>Address: {ANVIL_ACCOUNT_0}</h2>
        <h2>Network: {config.getClient().chain.name}</h2>
      </div>
      {!show() && (
        <button
          class={styles.connect}
          onclick={() => setShow((s) => !s)}
        >
          Connect to dApp
        </button>
      )}
      <Show when={show()}>
        <div class={styles.camera}>
          <button class={styles.close} onclick={() => setShow((s) => !s)}>
            Close
          </button>
          <span class={styles.info}>Show the QR code pls</span>
          <div class={styles.container}>
            <QRScanner />
          </div>
        </div>
      </Show>
    </main>
  )
}

export default App
