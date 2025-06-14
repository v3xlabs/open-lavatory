import { createConnector } from '@wagmi/core'
import type { CreateConnectorFn } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import type { Chain } from '@wagmi/core/chains'
import type { Address } from 'viem'

import { OpenLVProvider } from 'lib/provider'

export interface OpenLVParameters {
    /**
     * OpenLV project metadata
     */
    metadata?: {
        name?: string
        description?: string
        url?: string
        icons?: string[]
    }
    /**
     * Whether to show QR modal for connection
     * @default true
     */
    showQrModal?: boolean
}

openLvConnector.type = 'openLv' as const

export function openLvConnector(
    parameters: OpenLVParameters = {}
) {
    const showQrModal = parameters.showQrModal ?? true

    type Provider = OpenLVProvider
    type Properties = {
        connect(parameters?: {
            chainId?: number | undefined
            isReconnecting?: boolean | undefined
        }): Promise<{
            accounts: readonly Address[]
            chainId: number
        }>
        onDisplayUri(uri: string): void
        onSessionDelete(): void
    }

    let provider_: Provider | undefined
    let accounts: readonly Address[] = []
    let currentChain: Chain = mainnet
    let isConnected = false

    let displayUri: ((uri: string) => void) | undefined
    let disconnect_: (() => void) | undefined

    return createConnector<Provider, Properties>((config) => ({
        id: 'openLv',
        name: 'OpenLV Protocol',
        type: openLvConnector.type,
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTEuNSA5QzExLjUgOS44MjggMTAuODI4IDEwLjUgMTAgMTAuNUM5LjE3MiAxMC41IDguNSA5LjgyOCA4LjUgOUM4LjUgOC4xNzIgOS4xNzIgNy41IDEwIDcuNUMxMC44MjggNy41IDExLjUgOC4xNzIgMTEuNSA5WiIvPgo8cGF0aCBkPSJNMTcuNSA5QzE3LjUgOS44MjggMTYuODI4IDEwLjUgMTYgMTAuNUMxNS4xNzIgMTAuNSAxNC41IDkuODI4IDE0LjUgOUMxNC41IDguMTcyIDE1LjE3MiA3LjUgMTYgNy41QzE2LjgyOCA3LjUgMTcuNSA4LjE3MiAxNy41IDlaIi8+CjxwYXRoIGQ9Ik0xMyAxM0MxMy41NTIzIDEzIDE0IDEzLjQ0NzcgMTQgMTRDMTQgMTQuNTUyMyAxMy41NTIzIDE1IDEzIDE1SDE1QzE1IDEzLjg5NTQgMTQuMTA0NiAxMyAxMyAxM1oiLz4KPC9zdmc+Cjwvc3ZnPgo=',

        async setup() {
            const provider = await this.getProvider().catch(() => null)
            if (!provider) return

            // Set up persistent event listeners
            if (!disconnect_) {
                disconnect_ = this.onDisconnect.bind(this)
                // Note: In real implementation, you'd set up proper disconnect handlers
            }
        },

        async connect({ chainId, ...rest } = {}) {
            try {
                const provider = await this.getProvider()
                
                // Set up display URI handler if not already set
                if (!displayUri && showQrModal) {
                    displayUri = this.onDisplayUri
                    provider.on('display_uri', displayUri)
                }

                // Determine target chain
                let targetChainId = chainId
                if (!targetChainId) {
                    const state = (await config.storage?.getItem('state')) ?? {}
                    const isChainSupported = config.chains.some(
                        (x) => x.id === state.chainId,
                    )
                    if (isChainSupported) targetChainId = state.chainId
                    else targetChainId = config.chains[0]?.id
                }

                if (!targetChainId) throw new Error('No chains found on connector.')

                // Initialize connection
                await provider.init()

                // Simulate connection process
                // In real implementation, this would:
                // 1. Display QR code to user
                // 2. Wait for peer to scan and connect
                // 3. Complete handshake and get account info

                // For demo purposes, simulate a successful connection
                await new Promise((resolve) => setTimeout(resolve, 2000))

                // Mock account data - in reality this would come from the connected wallet
                const mockAccounts = ['0x742d35Cc6628C8532272bFBd1C5DDeE8C69Cd52E'] as Address[]
                accounts = mockAccounts
                
                currentChain = config.chains.find(chain => chain.id === targetChainId) || config.chains[0]!
                isConnected = true

                // Clean up display URI handler
                if (displayUri) {
                    provider.removeListener('display_uri', displayUri)
                    displayUri = undefined
                }

                return {
                    accounts,
                    chainId: currentChain.id,
                }
            } catch (error) {
                console.error('OpenLV connection failed:', error)
                throw error
            }
        },

        async disconnect() {
            const provider = await this.getProvider()
            try {
                provider?.disconnect()
            } catch (error) {
                console.error('Disconnect error:', error)
            } finally {
                accounts = []
                isConnected = false
                currentChain = mainnet
                provider_ = undefined
            }
        },

        async getAccounts() {
            return accounts
        },

        async getProvider() {
            if (!provider_) {
                provider_ = new OpenLVProvider()
            }
            return provider_
        },

        async getChainId() {
            return currentChain.id
        },

        async isAuthorized() {
            try {
                return isConnected && accounts.length > 0
            } catch {
                return false
            }
        },

        async switchChain({ chainId: newChainId }) {
            const chain = config.chains.find((x) => x.id === newChainId)
            if (!chain) throw new Error(`Chain ${newChainId} not configured`)

            const provider = await this.getProvider()
            if (!provider) throw new Error('Provider not connected')

            try {
                // In real implementation, would send JSON-RPC request to peer
                // For now, just update local state
                currentChain = chain
                
                // Emit change event
                config.emitter.emit('change', { chainId: newChainId })
                
                return chain
            } catch (error) {
                console.error('Chain switch failed:', error)
                throw error
            }
        },

        onAccountsChanged(accounts) {
            if (accounts.length === 0) this.onDisconnect()
            else config.emitter.emit('change', { accounts: accounts as Address[] })
        },

        onChainChanged(chainId) {
            const newChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId)
            const targetChain = config.chains.find(chain => chain.id === newChainId)
            if (targetChain) {
                currentChain = targetChain
            }
            config.emitter.emit('change', { chainId: newChainId })
        },

        async onConnect(connectInfo) {
            const chainId = Number(connectInfo.chainId)
            const accounts = await this.getAccounts()
            config.emitter.emit('connect', { accounts, chainId })
        },

        async onDisconnect() {
            accounts = []
            isConnected = false
            currentChain = mainnet
            config.emitter.emit('disconnect')
        },

        onDisplayUri(uri) {
            console.log('🔗 OpenLV Connection URI:', uri)
            config.emitter.emit('message', {
                type: 'display_uri',
                data: uri,
            })
        },

        onSessionDelete() {
            this.onDisconnect()
        },
    }))
}
