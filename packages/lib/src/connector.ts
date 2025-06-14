import { createConnector } from 'wagmi'
import { OpenLVProvider } from './provider.js'

export const openLvConnector = createConnector((config) => ({
    connect: async (parameters) => {

        return { accounts:[], chainId:1 }
    },
    disconnect: async () => { 
        
    },
    id: 'openLv',
    name: 'OpenLV',
    getAccounts: async () => {
        return []
    },
    getChainId: async () => {
        return 1
    },
    getProvider: async (parameters) => {
        const provider = new OpenLVProvider()
        
        return provider
    },
   isAuthorized: async () => {
       return true
   },
   type: 'wallet',
   onAccountsChanged: async () => {
       
   },
   onChainChanged: async () => {
       
   },
   onDisconnect: async () => { },
}))