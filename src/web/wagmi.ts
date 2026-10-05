// Wallet setup: injected wallets (Binance Wallet extension, MetaMask, Trust…)
// on BSC mainnet, plus the local demo chain (anvil, chain 31337) for testing.

import { createConfig, http } from "wagmi";
import { bsc, foundry } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [bsc, foundry],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org"),
    [foundry.id]: http(process.env.NEXT_PUBLIC_LOCAL_RPC_URL ?? "http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
