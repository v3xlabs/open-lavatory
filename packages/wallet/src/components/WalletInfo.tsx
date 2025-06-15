import { useBalance, useClient } from 'wagmi'
import { ANVIL_ACCOUNT } from '../../lib/anvil'
import { formatEther } from 'viem'
import styles from './WalletInfo.module.css'

const Balance = () => {
  const { data: balance, error } = useBalance({
    address: ANVIL_ACCOUNT,
  })


  if (error) return <div>Error: {error.message}</div>
  if (!balance) return <div>Loading...</div>

  const formatted = formatEther(balance.value)

  return <div className={styles.balance}>{formatted.slice(0, formatted.indexOf('.'))} <img height={32} width={32} src="/eth.svg" alt="ETH" /></div>
}

const Address = () => {
  return <div className={styles.address}>{ANVIL_ACCOUNT.slice(0, 6)}...{ANVIL_ACCOUNT.slice(-4)}</div>
}

const Chain = () => {
    const client = useClient()

  return <div>chain: {client?.chain.name}</div>
}

export const WalletInfo = () => {
  return (
    <div className={styles.container}>
      <Balance />
      <Address />
      <Chain />
    </div>
  )
}
