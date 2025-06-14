import { onCleanup, onMount } from 'solid-js'
import QrScanner from 'qr-scanner'
import styles from './QRScanner.module.css'
import { OpenLVConnection } from 'lib'
import type { BlockTag, EIP1193Parameters, EIP1474Methods, RpcBlockIdentifier } from 'viem'
import { ANVIL_ACCOUNT_0 } from '../../lib/const'
import { config } from '../../lib/wagmi'
import { getBalance, getBlock, getBlockNumber } from 'viem/actions'

export const QRScanner = () => {
  let videoEl: HTMLVideoElement | undefined = undefined
  let scanner: QrScanner

  onMount(() => {
    scanner = new QrScanner(videoEl!, ({ data }: { data: string }) => {
      const conn = new OpenLVConnection()
      const client = config.getClient()

      conn.connectToSession({
        openLVUrl: data,
        onMessage: (message) => {
          const payload = JSON.parse(message)

          if (payload.params.startsWith('eth_')) {
            const { method, params } = payload as EIP1193Parameters<EIP1474Methods>
            switch (method) {
              case 'eth_requestAccounts':
              case 'eth_accounts':
                return [ANVIL_ACCOUNT_0]
              case 'eth_chainId':
                return client.chain.id
              case 'eth_getBalance':
                return getBalance(client, { address: params[0], blockTag: params[1] as BlockTag })
              case 'eth_blockNumber':
                return getBlockNumber(client)
            }
          }
        },
      })
    }, {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 1,
    })

    scanner.start()
      .then(() => {
        console.log('Scanner started')
        console.log('Video stream:', videoEl!.srcObject)
      })
      .catch((err) => {
        console.error('Failed to start scanner:', err)
      })
  })

  onCleanup(() => {
    scanner?.stop()
    scanner?.destroy()
  })

  return (
    <video
      ref={videoEl!}
      width={500}
      height={500}
      autoplay
      muted
      playsinline
      class={styles.video}
    />
  )
}
