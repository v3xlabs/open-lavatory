import { createSignal, onCleanup, onMount } from 'solid-js'
import { Config, getBalance, watchAccount } from '@wagmi/core'
import type { Address } from 'viem'

export function useWalletBalance(config: Config, address: Address) {
  const [balance, setBalance] = createSignal<bigint>(0n)

  let stopAccountWatch: (() => void) | undefined

  onMount(() => {
    stopAccountWatch = watchAccount(config, {
      onChange(account) {
        if (account?.address) {
          fetchBalance(address)
        } else {
          setBalance(0n)
        }
      },
    })
  })

  onCleanup(() => {
    stopAccountWatch?.()
  })

  async function fetchBalance(address: Address) {
    try {
      const balanceData = await getBalance(config, { address })
      setBalance(balanceData.value)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      setBalance(0n)
    }
  }
  

    return balance
}
