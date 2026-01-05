import './style.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';

import { config } from '../lib/wagmi.ts';
import { App } from './App.tsx';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.querySelector('#root')!).render(
    <React.StrictMode>
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </WagmiProvider>
    </React.StrictMode>
);
