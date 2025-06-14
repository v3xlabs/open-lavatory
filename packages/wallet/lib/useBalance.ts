import { createSignal, onCleanup, onMount } from 'solid-js'
import { Config, getBalance, watchAccount, watchBlocks } from '@wagmi/core'
import type { Address } from 'viem'

export function useWalletBalance(config: Config, address: Address) {
  const [balance, setBalance] = createSignal<bigint>(0n)

  let stopBlockWatch: (() => void) | undefined

  onMount(() => {

    // Watch for new blocks
    stopBlockWatch = watchBlocks(config, {
      onBlock(block) {
        console.log('New block:', block)
        if (address) {
          fetchBalance(address)
        }
      },
    })
  })

  onCleanup(() => {
    stopBlockWatch?.()
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
