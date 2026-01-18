// src/hooks/useScanner.ts
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
      // 1. Ambil Metadata & Saldo dari Moralis (Sangat cepat & ada Spam Filter)
      // Moralis memberikan logo, simbol, dan status spam dalam satu request.
      const moralisRes = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/wallets/${addrToScan}/tokens?chain=base`,
        { 
          headers: { 'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY },
          params: { exclude_spam: true } // Otomatis filter koin spam
        }
      );

      const rawTokens = moralisRes.data.result || [];

      if (rawTokens.length === 0) {
        setTokens([]);
        return;
      }

      // 2. Ambil Likuiditas dari DexScreener untuk memfilter tab "Swap"
      // Kita hanya mengambil data likuiditas untuk koin yang ditemukan oleh Moralis.
      const tokenAddresses = rawTokens.map((t: any) => t.token_address).join(',');
      const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`);
      const pairs = dexRes.data.pairs || [];

      // 3. Gabungkan data Moralis dan DexScreener
      const detailedTokens = rawTokens.map((t: any) => {
        // Cari informasi likuiditas koin ini di DexScreener
        const pair = pairs.find((p: any) => p.baseToken.address.toLowerCase() === t.token_address.toLowerCase());
        
        return {
          address: t.token_address,
          symbol: t.symbol,
          name: t.name,
          logo: t.thumbnail || t.logo || pair?.info?.imageUrl || null, // Prioritas logo Moralis
          balance: t.balance, // Saldo dalam format BigInt string
          decimals: t.decimals,
          liquidityUSD: pair?.liquidity?.usd || 0, // Digunakan untuk filter di tab Swap
          priceUSD: pair?.priceUsd || "0",
          network: 'base-mainnet'
        };
      });

      setTokens(detailedTokens);
    } catch (error) {
      console.error("Scanning failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { scanTrash, tokens, isLoading };
}