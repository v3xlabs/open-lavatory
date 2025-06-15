import { QRScanner } from './components/QRScanner'
import styles from './App.module.css'

function App() {
  return (
    <>
     <header className={styles.header}>
      <span>"Mobile" Wallet</span>
       <QRScanner onScanned={(result) => console.log(result)} />
     </header>
    </>
  )
}

export default App
