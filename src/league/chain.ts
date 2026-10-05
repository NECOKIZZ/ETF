// Chain + keeper wallet from environment.
//   LEAGUE_CHAIN       bsc (default) | local
//   BSC_RPC_URL        RPC for BSC mainnet (or a fork)
//   ESCROW_ADDRESS     LeagueEscrow address
//   KEEPER_PRIVATE_KEY keeper wallet (falls back to DEPLOYER_PRIVATE_KEY)

import { createPublicClient, createWalletClient, http, type Address, type Chain, type Hex } from "viem";
import { bsc, foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export function chainFromEnv(): Chain {
  return process.env.LEAGUE_CHAIN === "local" ? foundry : bsc;
}

export function rpcFromEnv(): string {
  return process.env.BSC_RPC_URL ?? (process.env.LEAGUE_CHAIN === "local" ? "http://127.0.0.1:8545" : "https://bsc-dataseed.bnbchain.org");
}

export function escrowFromEnv(): Address {
  const a = process.env.ESCROW_ADDRESS;
  if (!a) throw new Error("ESCROW_ADDRESS not set");
  return a as Address;
}

export function clientsFromEnv(withWallet = false) {
  const chain = chainFromEnv();
  const transport = http(rpcFromEnv());
  const pub = createPublicClient({ chain, transport });
  if (!withWallet) return { chain, pub, wallet: null, account: null };
  const pk = (process.env.KEEPER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY) as Hex | undefined;
  if (!pk) throw new Error("KEEPER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) not set");
  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ chain, transport, account });
  return { chain, pub, wallet, account };
}
