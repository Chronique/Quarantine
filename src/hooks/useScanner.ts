import { useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

export function useScanner() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Memecah array menjadi maksimal 30 alamat per request untuk DexScreener
  const chunkArray = (array: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const scanTrash = async (targetAddress?: string) => {
    const addrToScan = targetAddress || address;
    if (!addrToScan) return;

    setIsLoading(true);
    setTokens([]);

    try {
      // 1. Ambil Saldo & Metadata dari Moralis (Base Chain)
      const moralisRes = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/wallets/${addrToScan}/tokens?chain=base`,
        { 
          headers: { 'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY || '' },
          params: { exclude_spam: true } 
        }
      );

      const rawTokens = moralisRes.data.result || [];
      if (rawTokens.length === 0) {
        setTokens([]);
        return;
      }

      // 2. Ambil Likuiditas dari DexScreener secara bertahap (Chunking)
      const tokenAddresses = rawTokens.map((t: any) => t.token_address);
      const addressChunks = chunkArray(tokenAddresses, 30);
      
      let allPairs: any[] = [];
      for (const chunk of addressChunks) {
        const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(',')}`);
        if (dexRes.data.pairs) {
          allPairs = [...allPairs, ...dexRes.data.pairs];
        }
      }

      // 3. Mapping data akhir
      const enrichedTokens = rawTokens.map((t: any) => {
        const pair = allPairs.find((p: any) => p.baseToken.address.toLowerCase() === t.token_address.toLowerCase());
        return {
          address: t.token_address,
          symbol: t.symbol,
          name: t.name,
          logo: t.thumbnail || t.logo || pair?.info?.imageUrl || null,
          balance: t.balance,
          decimals: t.decimals,
          liquidityUSD: pair?.liquidity?.usd || 0,
          priceUSD: pair?.priceUsd || "0"
        };
      });

      setTokens(enrichedTokens);
    } catch (error) {
      console.error("Scanning failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { scanTrash, tokens, isLoading };
}