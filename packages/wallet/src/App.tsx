import type { Component } from 'solid-js';
import { createSignal, Show } from 'solid-js'

import logo from './logo.svg';
import styles from './App.module.css';
import { QRScanner } from './components/QRScanner';

const App: Component = () => {

  const [show, setShow] = createSignal(false)

  return (
    <div class={styles.App}>
      <button onclick={() => setShow(s => !s)}>
        {show() ? 'Hide modal' : 'Connect Wallet'}
      </button>
      <Show when={show()}>
        <QRScanner />
      </Show>
    </div>
  );
};

export default App;
