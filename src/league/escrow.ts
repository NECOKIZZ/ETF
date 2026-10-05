// LeagueEscrow on-chain access: read a round's entries and baskets, and
// submit settlement. Works with any viem clients (BSC mainnet, a local fork,
// or a plain local chain in tests).

import { parseAbi, type Address, type Hex, type PublicClient, type WalletClient, type Chain, type Account } from "viem";
import type { ChainEntry, Settlement } from "./settlement";

export const leagueEscrowAbi = parseAbi([
  "function openRound(uint64 entryClose, uint64 end, uint128 stake, uint16 capMultiple, uint16 maxBackers) returns (uint256)",
  "function enterCreator(uint256 roundId, bytes32 teamKey, address[] tokens, uint256[] amounts)",
  "function enterCreatorNamed(uint256 roundId, bytes32 teamKey, address[] tokens, uint256[] amounts, uint16[] weightsBps, string name, uint16 buyFeeBps)",
  "function enterBacker(uint256 roundId, bytes32 teamKey)",
  "function claimBasket(uint256 roundId)",
  "function settle(uint256 roundId, uint128[] payouts, uint256 platformCut, uint256 seasonIn, uint256 seasonOut, bytes32 inputsHash)",
  "function voidRound(uint256 roundId)",
  "function claim(uint256 roundId)",
  "function setTokenAllowed(address token, bool allowed)",
  "function fundSeason(uint256 amount)",
  "function roundCount() view returns (uint256)",
  "function rounds(uint256) view returns (uint8 status, uint64 entryClose, uint64 end, uint16 capMultiple, uint16 maxBackers, uint128 stake, uint128 totalStakes, bytes32 inputsHash)",
  "function entryCount(uint256 roundId) view returns (uint256)",
  "function entryAt(uint256 roundId, uint256 i) view returns ((address wallet, bytes32 teamKey, bool isCreator, bool claimed, uint128 payout))",
  "function basketOf(uint256 roundId, address wallet) view returns (address[] tokens, uint256[] amounts)",
  "function captainOf(uint256 roundId, bytes32 teamKey) view returns (address)",
  "function membersOf(uint256 roundId, bytes32 teamKey) view returns (uint256)",
  "function teamMeta(uint256 roundId, bytes32 teamKey) view returns (string name, uint16 buyFeeBps)",
  "function weightsOf(uint256 roundId, address wallet) view returns (uint16[])",
  "function entryIndex(uint256 roundId, address wallet) view returns (uint256)",
  "function allowedToken(address token) view returns (bool)",
  "function stakeToken() view returns (address)",
  "function paused() view returns (bool)",
  "function seasonPot() view returns (uint256)",
  "function platformBalance() view returns (uint256)",
  "event RoundOpened(uint256 indexed roundId, uint64 entryClose, uint64 end, uint128 stake)",
  "event RoundSettled(uint256 indexed roundId, bytes32 inputsHash, uint256 platformCut, uint256 seasonIn, uint256 seasonOut)",
]);

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address who) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export const ROUND_STATUS = ["None", "Open", "Settled", "Voided"] as const;

export interface RoundInfo {
  id: bigint;
  status: (typeof ROUND_STATUS)[number];
  entryClose: number; // unix seconds
  end: number;
  capMultiple: number;
  maxBackers: number;
  stake: bigint;
  totalStakes: bigint;
  inputsHash: Hex;
}

export async function readRound(client: PublicClient, escrow: Address, id: bigint): Promise<RoundInfo> {
  const r = await client.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "rounds", args: [id] });
  const [status, entryClose, end, capMultiple, maxBackers, stake, totalStakes, inputsHash] = r;
  return { id, status: ROUND_STATUS[status] ?? "None", entryClose: Number(entryClose), end: Number(end), capMultiple, maxBackers, stake, totalStakes, inputsHash };
}

/** All entries of a round, in contract order, with creators' locked baskets. */
export async function readEntries(client: PublicClient, escrow: Address, id: bigint): Promise<ChainEntry[]> {
  const count = Number(await client.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryCount", args: [id] }));
  const one = async (i: number): Promise<ChainEntry> => {
    const e = await client.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryAt", args: [id, BigInt(i)] });
    const entry: ChainEntry = { index: i, wallet: e.wallet, teamKey: e.teamKey, isCreator: e.isCreator, claimed: e.claimed, payout: e.payout };
    if (e.isCreator) {
      const [[tokens, amounts], weights] = await Promise.all([
        client.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "basketOf", args: [id, e.wallet] }),
        client.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "weightsOf", args: [id, e.wallet] }),
      ]);
      entry.basket = { tokens: [...tokens], amounts: [...amounts] };
      if (weights.length) entry.basket.weightsBps = weights.map(Number);
    }
    return entry;
  };
  const entries: ChainEntry[] = [];
  for (let i = 0; i < count; i += 16) {
    entries.push(...(await Promise.all(Array.from({ length: Math.min(16, count - i) }, (_, k) => one(i + k)))));
  }
  return entries;
}

/** Name and buy fee of each team, by team key (lowercase). Empty name = unnamed. */
export async function readTeamMeta(client: PublicClient, escrow: Address, id: bigint, teamKeys: Hex[]) {
  const out = new Map<string, { name: string; buyFeeBps: number }>();
  await Promise.all(
    [...new Set(teamKeys.map((k) => k.toLowerCase() as Hex))].map(async (k) => {
      const [name, buyFeeBps] = await client.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "teamMeta", args: [id, k] });
      out.set(k, { name, buyFeeBps });
    }),
  );
  return out;
}

/** Every token locked in a round (for snapshots). */
export const roundTokens = (entries: ChainEntry[]): Hex[] => [
  ...new Set(entries.flatMap((e) => e.basket?.tokens.map((t) => t.toLowerCase() as Hex) ?? [])),
];

/** Submit settlement; waits for the receipt. */
export async function submitSettlement(
  client: PublicClient,
  wallet: WalletClient,
  escrow: Address,
  id: bigint,
  s: Settlement,
  account: Account,
  chain: Chain | null,
): Promise<Hex> {
  const hash = await wallet.writeContract({
    address: escrow,
    abi: leagueEscrowAbi,
    functionName: "settle",
    args: [id, s.payouts, s.platformCut, s.seasonIn, s.seasonOut, s.inputsHash],
    account,
    chain,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`settle reverted: ${hash}`);
  return hash;
}
