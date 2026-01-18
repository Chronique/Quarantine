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
      
      const res = await axios.post(alchemyUrl, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [addrToScan],
        id: 42
      });

      const rawBalances = res.data.result.tokenBalances;

      // Ambil metadata untuk setiap koin (Simbol, Nama, Logo)
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
              network
            };
          })
      );

      setTokens(detailedTokens);
    } catch (error) {
      console.error(`${network} Scan failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return { scanTrash, tokens, isLoading };
}