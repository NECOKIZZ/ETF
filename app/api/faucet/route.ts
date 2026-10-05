// POST /api/faucet { wallet, usdt?, stocks?: { [ticker]: usd } }: LOCAL DEMO
// CHAIN ONLY. Mints mock USDT and mock stock tokens and tops up gas, so the
// create / back / claim flows can be tried without real money.
import { NextResponse } from "next/server";
import { createTestClient, http, isAddress, parseAbi, parseEther, type Address } from "viem";
import { foundry } from "viem/chains";
import { clientsFromEnv, rpcFromEnv } from "@/league/chain";
import { chainStocks, isLocal, publicConfig } from "@/league/server";

export const dynamic = "force-dynamic";

const mintAbi = parseAbi(["function mint(address to, uint256 amount)"]);

export async function POST(req: Request) {
  if (!isLocal()) return NextResponse.json({ error: "the faucet only exists on the local demo chain" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { wallet?: string; usdt?: number; stocks?: Record<string, number> } | null;
  if (!b?.wallet || !isAddress(b.wallet)) return NextResponse.json({ error: "wallet must be an address" }, { status: 400 });
  const wallet = b.wallet as Address;
  const { pub, wallet: signer, account, chain } = clientsFromEnv(true);
  const cfg = await publicConfig();
  const { stocks } = await chainStocks();
  const test = createTestClient({ chain: foundry, mode: "anvil", transport: http(rpcFromEnv()) });
  await test.setBalance({ address: wallet, value: parseEther("10") });

  const minted: Record<string, string> = {};
  const mint = async (token: Address, amount: bigint, label: string) => {
    const hash = await signer!.writeContract({ address: token, abi: mintAbi, functionName: "mint", args: [wallet, amount], account: account!, chain });
    await pub.waitForTransactionReceipt({ hash });
    minted[label] = amount.toString();
  };
  const usdt = Math.min(Math.max(b.usdt ?? 50, 0), 1000);
  if (usdt > 0) await mint(cfg.usdt, BigInt(Math.round(usdt * 1e6)) * 10n ** 12n, "USDT");
  for (const [ticker, usd] of Object.entries(b.stocks ?? {})) {
    const s = stocks.find((x) => x.ticker === ticker.toUpperCase());
    if (!s || !(usd > 0 && usd <= 1000)) continue;
    await mint(s.address, (BigInt(Math.round(usd * 1e6)) * 10n ** 18n) / BigInt(Math.round(s.price * 1e6)), s.ticker);
  }
  return NextResponse.json({ wallet, minted, gas: "10 ETH (local)" });
}
