import { Portal, Show } from 'solid-js/web'
import styles from './RequestModal.module.css'
import { EIP1193Parameters, EIP1474Methods } from 'viem'
import { ANVIL_ACCOUNT_0 } from '../../lib/const'

type Props = {
  payload: EIP1193Parameters<
    EIP1474Methods
  >
  setResponse: (response: any[]) => void
}

const Container = ({ payload, setResponse }: Props) => {
  switch (payload.method) {
    case 'eth_accounts':
    case 'eth_requestAccounts':
      return (
        <div class={styles.connect}>
          <span>Connect Wallet?</span>
          <div>
            <button onClick={() => setResponse([ANVIL_ACCOUNT_0])}>
              Approve
            </button>
            <button onClick={() => setResponse([])}>Reject</button>
          </div>
        </div>
      )
  }
}

export const RequestModal = (props: Props) => {
  return (
    <Portal>
      <Show when={true}>
        <div class={styles.container}>
          <Container {...props} />
        </div>
      </Show>
    </Portal>
  )
}
