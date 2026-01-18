import { useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

export function useScanner() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scanTrash = async (targetAddress?: string) => {
    const addrToScan = targetAddress || address;
    if (!addrToScan) return;

    setIsLoading(true);
    setTokens([]);

    try {
      const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_TOKEN_API}`;
      
      // 1. Ambil semua saldo koin dari Alchemy
      const balRes = await axios.post(alchemyUrl, {
        jsonrpc: "2.0", method: "alchemy_getTokenBalances",
        params: [addrToScan], id: 42
      });

      const rawBalances = balRes.data.result.tokenBalances.filter((t: any) => 
        t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      if (rawBalances.length === 0) {
        setTokens([]); return;
      }

      // 2. Ambil Likuiditas & Metadata dari DexScreener
      const addresses = rawBalances.map((b: any) => b.contractAddress).join(',');
      const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`);
      
      const pairs = dexRes.data.pairs || [];

      // 3. Gabungkan saldo Alchemy dengan data Likuiditas DexScreener
      const enrichedTokens = rawBalances.map((b: any) => {
        // Cari pair dengan likuiditas tertinggi untuk koin ini
        const tokenPairs = pairs.filter((p: any) => p.baseToken.address.toLowerCase() === b.contractAddress.toLowerCase());
        const bestPair = tokenPairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

        return {
          address: b.contractAddress,
          balance: b.tokenBalance,
          symbol: bestPair?.baseToken?.symbol || "???",
          logo: bestPair?.info?.imageUrl || null,
          liquidityUSD: bestPair?.liquidity?.usd || 0,
          priceUSD: bestPair?.priceUsd || "0"
        };
      });

      setTokens(enrichedTokens);
    } catch (error) {
      console.error("Scan failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { scanTrash, tokens, isLoading };
}