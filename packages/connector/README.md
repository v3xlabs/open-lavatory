# @openlv/connector

The OpenLV Connector is a Wagmi connector for dApp integration.

```ts
import { http, createConfig, createStorage } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { openlv } from '@openlv/connector'

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [openlv({
    signaling: [
        {
            type: 'mqtt',
            url: 'wss://test.mosquitto.org:8081/mqtt',
        }
    ]
  })],
  transports: {
    [mainnet.id]: http(),
  },
})
```

[Documentation](https://openlv.sh/api/connector)
