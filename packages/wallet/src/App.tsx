import type { Component } from 'solid-js'
import { createSignal, onMount, Show } from 'solid-js'
import styles from './App.module.css'
import { QRScanner } from './components/QRScanner'

const App: Component = () => {
  const [show, setShow] = createSignal(false)

  return (
    <main class={styles.main}>
      <button class={styles.connect} onclick={() => setShow((s) => !s)}>
        {show() ? 'Hide modal' : 'Connect Wallet'}
      </button>
      <Show when={show()}>
        <div class={styles.camera}>
          <button class={styles.close} onclick={() => setShow((s) => !s)}>
            Close
          </button>
          <div class={styles.container}>
            <QRScanner />
          </div>
        </div>
      </Show>
    </main>
  )
}

export default App
