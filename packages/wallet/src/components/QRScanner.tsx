import { Scanner } from '@yudiel/react-qr-scanner'
import { Dialog } from 'radix-ui'
import styles from './QRScanner.module.css'
import { EnterFullScreenIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { LoadingSVG } from './LoadingSVG'

const SessionDialog = ({setOpen}: {setOpen: (open: boolean) => void}) => {

  const [result, setResult] = useState<string | null>(null)

  const [isConnecting, setIsConnecting] = useState(false)

  return (
      <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            {isConnecting ? 'Establishing session' : 'Show the QR code'}
          </Dialog.Title>
          {isConnecting ? <div className={styles.loader}>
            <LoadingSVG height={36} width={36} />
          </div> : <Scanner
            sound={false}
            onScan={(result) => {
              if (result[0].format === 'qr_code') {
                setResult(result[0].rawValue)
                setIsConnecting(true)
              }
            }}
          />}
          <form
            onSubmit={(e) => {
              e.preventDefault()

              const uri = new FormData(e.currentTarget).get('uri') as string

              setResult(uri)
              setIsConnecting(true)
            }}
          >
            {!isConnecting && <input
              name='uri'
              className={styles.input}
              placeholder='openlv://<uuid>'
            />}
          </form>
        </Dialog.Content>
  )
}

export const QRScanner = () => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className={styles.cta}>
          <EnterFullScreenIcon />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
      <SessionDialog setOpen={setOpen} />
      </Dialog.Portal>
    </Dialog.Root>
  )
}
