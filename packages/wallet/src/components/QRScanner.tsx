import { onCleanup } from 'solid-js'
import QrScanner from 'qr-scanner'

export const QRScanner = () => {
  let videoEl: HTMLVideoElement | undefined
  let scanner: QrScanner | undefined

  const initScanner = () => {
    if (!videoEl) return

    scanner = new QrScanner(videoEl, result => {
      alert('Scanned: ' + result.data)
    }, {
      highlightScanRegion: true,
      highlightCodeOutline: true,
    })

    scanner.start()
  }

  // Proper ref assignment in SolidJS
  const setRef = (el: HTMLVideoElement) => {
    videoEl = el
    initScanner()
  }

  // Clean up scanner on component destroy
  onCleanup(() => {
    scanner?.stop()
    scanner?.destroy()
  })

  return <video ref={setRef} width={500} height={500} />
}
