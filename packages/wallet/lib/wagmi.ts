import { http, createConfig } from '@wagmi/core'
import { anvil } from '@wagmi/core/chains'

export const config = createConfig({
  chains: [anvil],
  transports: {
    [anvil.id]: http('http://localhost:8545'),
  },
})