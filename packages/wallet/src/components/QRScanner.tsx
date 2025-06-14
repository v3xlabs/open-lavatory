import { onCleanup, onMount } from 'solid-js'
import QrScanner from 'qr-scanner'
import styles from './QRScanner.module.css'
import { OpenLVConnection } from 'lib'

export const QRScanner = (
  { onMessage, onConnect }: {
    onMessage: (message: string) => void
    onConnect: () => void
  },
) => {
  let videoEl: HTMLVideoElement | undefined = undefined
  let scanner: QrScanner

  onMount(() => {
    scanner = new QrScanner(videoEl!, ({ data }: { data: string }) => {
      const conn = new OpenLVConnection()

      scanner.stop()

      onConnect()

      conn.connectToSession({
        openLVUrl: data,
        onMessage,
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
