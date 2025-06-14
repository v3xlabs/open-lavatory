import { onCleanup, onMount } from 'solid-js'
import QrScanner from 'qr-scanner'
import { tryConnect } from '../utils/tryConnect'
import styles from './QRScanner.module.css'

export const QRScanner = () => {
  let videoEl: HTMLVideoElement | undefined = undefined
  let scanner: QrScanner

  onMount(() => {
    scanner = new QrScanner(videoEl!, tryConnect, {
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
