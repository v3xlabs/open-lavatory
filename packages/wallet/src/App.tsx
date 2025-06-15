import { QRScanner } from './components/QRScanner'
import styles from './App.module.css'
import { WalletInfo } from './components/WalletInfo'
import { useState } from 'react'

function App() {

  const [result, setResult] = useState<string | null>(null)

  return (
    <>
      <header className={styles.header}>
        <span>"Mobile" Wallet</span>
        <QRScanner onScanned={(result) => setResult(result)} />
      </header>
      <WalletInfo />
    </>
  )
}

export default App
