// src/hooks/useScanner.ts
import { useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

export function useScanner() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scanTrash = async (targetAddress?: string, network: string = 'base-mainnet') => {
    const addrToScan = targetAddress || address;
    if (!addrToScan) return;

    setIsLoading(true);
    setTokens([]);

    try {
      const alchemyUrl = `https://${network}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_TOKEN_API}`;
      
      // 1. Ambil semua saldo token dari Alchemy
      const res = await axios.post(alchemyUrl, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [addrToScan],
        id: 42
      });

      const rawBalances = res.data.result.tokenBalances;

      // 2. Ambil Saldo & Metadata dari Moralis (Sangat akurat untuk Logo & Spam Filter)
      const moralisRes = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/wallets/${addrToScan}/tokens?chain=base`,
        { headers: { 'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY } }
      );

      const rawTokens = moralisRes.data.result || [];

      if (rawTokens.length === 0) {
        setTokens([]);
        return;
      }


      // 3. Ambil data Likuiditas & Logo dari DexScreener
      const addresses = rawBalances.map((b: any) => b.contractAddress).join(',');
      const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`);
      const pairs = dexRes.data.pairs || [];

      // 4. Ambil metadata (Simbol & Logo) secara paralel
      const detailedTokens = await Promise.all(
        rawBalances
          .filter((t: any) => t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000")
          .map(async (t: any) => {
            const metaRes = await axios.post(alchemyUrl, {
              jsonrpc: "2.0",
              method: "alchemy_getTokenMetadata",
              params: [t.contractAddress],
              id: 1
            });
            const meta = metaRes.data.result;
            return {
              address: t.contractAddress,
              symbol: meta.symbol,
              logo: meta.logo,
              balance: t.tokenBalance,
              decimals: meta.decimals,
              network
            };
          })
      );

      setTokens(detailedTokens);
    } catch (error) {
      console.error("Alchemy Scan failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { scanTrash, tokens, isLoading };
}