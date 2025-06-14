import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import QrScanner from 'qr-scanner'
import styles from './QRScanner.module.css'
import { JsonRpcRequest, OpenLVConnection } from 'lib'

export const QRScanner = (
  { onMessage, onConnect }: {
    onMessage: (message: JsonRpcRequest) => void
    onConnect: () => void
  },
) => {
  let videoEl: HTMLVideoElement | undefined = undefined
  let scanner: QrScanner

  const [url, setUrl] = createSignal('')
  let conn: OpenLVConnection

  onMount(() => {
    scanner = new QrScanner(
      videoEl!,
      ({ data }: { data: string }) => {
        scanner.stop()
        setUrl(data) // defer connection until url is updated
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 1,
      },
    )

    scanner
      .start()
      .then(() => {
        console.log('Scanner started')
        console.log('Video stream:', videoEl!.srcObject)
      })
      .catch((err) => {
        console.error('Failed to start scanner:', err)
      })
  })

  // Connect when URL is set
  createEffect(() => {
    const currentUrl = url()
    if (!currentUrl) return

    conn = new OpenLVConnection()
    onConnect()
    conn.connectToSession(currentUrl)
    conn.onMessage(onMessage)
  })

  onCleanup(() => {
    scanner?.stop()
    scanner?.destroy()
  })

  return (
    <>
      <input
        onchange={(e) => {
          setUrl(e.target.value)
        }}
      />
      <video
        ref={videoEl!}
        width={500}
        height={500}
        autoplay
        muted
        playsinline
        class={styles.video}
      />
    </>
  )
}
