import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import styles from './App.module.css'
import { QRScanner } from './components/QRScanner'
import { config } from '../lib/wagmi'
import { useWalletBalance } from '../lib/useBalance'
import { BlockTag, EIP1193Parameters, EIP1474Methods, formatEther } from 'viem'
import { ANVIL_ACCOUNT_0 } from '../lib/const'
import { getBalance, getBlockNumber } from 'viem/actions'
import { Portal } from 'solid-js/web'
import { RequestModal } from './components/RequestModal'

const App: Component = () => {
  const [show, setShow] = createSignal(false)
  const [isConnected, setIsConnected] = createSignal(false)
  const [payload, setPayload] = createSignal<
    EIP1193Parameters<EIP1474Methods>
  >()
  const [response, setResponse] = createSignal<any[]>()

  const [isAuthorized, setIsAuthorized] = createSignal(false)

  const balance = useWalletBalance(config, ANVIL_ACCOUNT_0)

  return (
    <main class={styles.main}>
      <h1>"Mobile" App</h1>
      <div>
        <h2>Balance: {formatEther(balance())} ETH</h2>
        <h2>Address: {ANVIL_ACCOUNT_0}</h2>
        <h2>Network: {config.getClient().chain.name}</h2>
        <h2>Connected: {isConnected() ? 'Yes' : 'No'}</h2>
      </div>
      {!show() && (
        <button
          class={styles.connect}
          onclick={() => setShow((s) => !s)}
        >
          Connect to dApp
        </button>
      )}
      {/* <RequestModal
        payload={{ method: 'eth_requestAccounts' }}
        setResponse={setResponse}
      /> */}
      {/* {payload() && <RequestModal payload={payload()!} setResponse={setResponse} />} */}
      <Portal>
        <Show when={show()}>
          <div class={styles.camera}>
            <button class={styles.close} onclick={() => setShow((s) => !s)}>
              Close
            </button>
            <span class={styles.info}>Show the QR code pls</span>
            <div class={styles.container}>
              <QRScanner
                onConnect={() => {
                  setShow(false)
                  setIsConnected(true)
                }}
                onMessage={(message) => {
                  const payload = JSON.parse(message)
                  const client = config.getClient()

                  console.log('Payload: ',payload)

                  if (payload.method.startsWith('eth_')) {
                    if (isAuthorized()) {
                      const { method, params } = payload as EIP1193Parameters<
                      EIP1474Methods
                    >
                    switch (method) {
                      case 'eth_requestAccounts':
                      case 'eth_accounts':
                        setPayload(payload)
                      case 'eth_chainId':
                        return client.chain.id
                      case 'eth_getBalance':
                        return getBalance(client, {
                          address: params[0],
                          blockTag: params[1] as BlockTag,
                        })
                      case 'eth_blockNumber':
                        return getBlockNumber(client)
                    }
                    } else {
                      return []
                    }
                  } else if (payload.method.startsWith('lv_')) {
                     
                  }
                }}
              />
            </div>
          </div>
        </Show>
      </Portal>
    </main>
  )
}

export default App
