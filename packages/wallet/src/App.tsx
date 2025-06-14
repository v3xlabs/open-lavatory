import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import styles from './App.module.css'
import { QRScanner } from './components/QRScanner'
import { config } from '../lib/wagmi'
import { useWalletBalance } from '../lib/useBalance'
import {
  BlockTag,
  EIP1193Parameters,
  EIP1474Methods,
  formatEther,
  numberToHex,
} from 'viem'
import { ANVIL_ACCOUNT_0 } from '../lib/const'
import { getBalance, getBlockNumber, signMessage } from 'viem/actions'
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
      {
        /* <RequestModal
        payload={{ method: 'eth_requestAccounts' }}
        setResponse={setResponse}
      /> */
      }
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
                onMessage={async (payload) => {
                  const client = config.getClient()

                  console.log('Payload: ', payload)

                  if (
                    payload.method.startsWith('eth_') ||
                    payload.method.startsWith('personal_')
                  ) {
                    if (isAuthorized()) {
                      const { method, params } = payload as EIP1193Parameters<
                        EIP1474Methods
                      >
                      switch (method) {
                        case 'eth_requestAccounts':
                        case 'eth_accounts':
                          return [ANVIL_ACCOUNT_0]
                        case 'eth_chainId':
                          return numberToHex(client.chain.id)
                        case 'eth_getBalance':
                          return numberToHex(
                            await getBalance(client, {
                              address: params[0],
                              blockTag: params[1] as BlockTag,
                            }),
                          )
                        case 'eth_blockNumber':
                          return numberToHex(await getBlockNumber(client))
                        case 'personal_sign':
                          return await signMessage(client, {
                            message: params[0],
                            account: params[1],
                          })
                        case 'eth_sendTransaction':
                        case 'eth_sendRawTransaction':
                        case 'wallet_sendTransaction':
                          alert(`${method} not implemented yet`)
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
