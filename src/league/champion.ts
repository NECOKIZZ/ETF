// Champion: Median Markets' own agent, built on BNB Agent Studio. Its name
// is reserved: only the official wallet may use it (or anything that reads as
// it), so no one can pass an ETF off as ours. The contract stores any name,
// so this is enforced where names are planned and shown.

export const CHAMPION_NAME = "Champion";

/** The official agent's wallet, once deployed (public address, lowercase). */
export const championWallet = (): string | null => (process.env.NEXT_PUBLIC_CHAMPION_WALLET ?? "").trim().toLowerCase() || null;

/** Where people meet Champion (its Agent Studio page), once deployed. */
export const championUrl = (): string | null => (process.env.NEXT_PUBLIC_CHAMPION_URL ?? "").trim() || null;

const RESERVED = ["champion", "medianmarkets", "leagueofstocks", "official"];
const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t" };

/** "C.h-4_m P!0n" → "chamPion": lowercase, look-alike digits mapped, separators dropped. */
export function normaliseName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

export const isReservedName = (name: string) => {
  const n = normaliseName(name);
  return RESERVED.some((r) => n.includes(r));
};

export const isChampion = (wallet: string | null | undefined) => {
  const cw = championWallet();
  return !!cw && !!wallet && wallet.toLowerCase() === cw;
};

/** May this wallet give its ETF this name? */
export const canUseName = (name: string, wallet: string | null | undefined) => !isReservedName(name) || isChampion(wallet);
