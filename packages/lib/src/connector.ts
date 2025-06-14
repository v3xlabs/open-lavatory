import { createConnector } from 'wagmi'

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
 getProvider(parameters) {
     
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