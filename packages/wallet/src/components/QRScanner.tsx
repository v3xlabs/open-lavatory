import { Scanner } from '@yudiel/react-qr-scanner'
import { Dialog } from 'radix-ui'
import styles from './QRScanner.module.css'

export const QRScanner = () => {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className={styles.cta}>Open Camera</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>Edit profile</Dialog.Title>
          <Scanner onScan={(result) => console.log(result)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
