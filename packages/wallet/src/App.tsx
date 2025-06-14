import type { Component } from 'solid-js'
import { createSignal, onMount, Show } from 'solid-js'
import styles from './App.module.css'
import { QRScanner } from './components/QRScanner'

const App: Component = () => {
  const [show, setShow] = createSignal(false)

  return (
    <main class={styles.main}>
      <h1>"Mobile" App</h1>
      <h2>1 ETH</h2>
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
