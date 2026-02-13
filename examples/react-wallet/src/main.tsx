import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";

import { config } from "../lib/wagmi.ts";
import { App } from "./App.tsx";

const client = new QueryClient();

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <WagmiProvider config={config}>
        <App />
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
