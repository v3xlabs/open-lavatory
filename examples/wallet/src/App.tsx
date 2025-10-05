import styles from "./App.module.css";
import { QRScanner } from "./components/QRScanner";
import { WalletInfo } from "./components/WalletInfo";

function App() {
  return (
    <>
      <header className={styles.header}>
        <span>&ldquo;Mobile&ldquo; Wallet</span>
        <QRScanner />
      </header>
      <WalletInfo />
    </>
  );
}

export default App;
