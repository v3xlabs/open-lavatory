import { QRScanner } from './components/QRScanner'

function App() {
  return (
    <>
     <div>
      <span>"Mobile" Wallet</span>
       <QRScanner onScanned={(result) => console.log(result)} />
     </div>
    </>
  )
}

export default App
