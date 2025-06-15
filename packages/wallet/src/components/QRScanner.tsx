import { Scanner } from '@yudiel/react-qr-scanner'
import { Dialog } from 'radix-ui'
import styles from './QRScanner.module.css'
import { EnterFullScreenIcon } from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'

export const QRScanner = (
  { onScanned }: { onScanned: (result: string) => void },
) => {
  const [result, setResult] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (result) {
      onScanned(result)
    }
  }, [result, onScanned])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className={styles.cta}>
          <EnterFullScreenIcon />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            Show the QR code to the camera
          </Dialog.Title>
          <Scanner
            sound={false}
            onScan={(result) => {
              if (result[0].format === 'qr_code') {
                setResult(result[0].rawValue)
                setOpen(false)
              }
            }}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault()

              const uri = new FormData(e.currentTarget).get('uri') as string

              setResult(uri)
              setOpen(false)
            }}
          >
            <input
              name='uri'
              className={styles.input}
              placeholder='openlv://<uuid>'
            />
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
