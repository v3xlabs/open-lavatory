import { QRScanner } from './components/QRScanner'
import styles from './App.module.css'
import { WalletInfo } from './components/WalletInfo'

function App() {
  return (
    <>
      <header className={styles.header}>
        <span>"Mobile" Wallet</span>
        <QRScanner />
      </header>
      <WalletInfo />
    </>
  )
}

export default App
