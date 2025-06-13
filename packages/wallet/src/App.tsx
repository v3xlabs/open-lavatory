import type { Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import { QRScanner } from './components/QRScanner';

const App: Component = () => {
  return (
    <div class={styles.App}>
      <QRScanner />
    </div>
  );
};

export default App;
