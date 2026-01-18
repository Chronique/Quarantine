import { useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

export function useScanner() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi untuk mengambil metadata token (Simbol, Nama, Logo) dari Alchemy
  const getTokenMetadata = async (tokenAddress: string, network: string) => {
    try {
      const url = `https://${network}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_TOKEN_API}`;
      const response = await axios.post(url, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [tokenAddress],
        id: 1
      });
      return response.data.result;
    } catch (error) {
      return { symbol: '???', logo: null };
    }
  };

  const scanTrash = async (targetAddress?: string, network: string = 'base-mainnet') => {
    const addrToScan = targetAddress || address;
    if (!addrToScan) return;

    setIsLoading(true);
    setTokens([]);

    try {
      const alchemyUrl = `https://${network}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_TOKEN_API}`;
      
      // 1. Ambil semua saldo token
      const res = await axios.post(alchemyUrl, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [addrToScan],
        id: 42
      });

      const rawBalances = res.data.result.tokenBalances;

      // 2. Filter koin yang memiliki saldo (bukan nol)
      const activeBalances = rawBalances.filter((t: any) => 
        t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      // 3. Ambil Metadata secara paralel
      const detailedTokens = await Promise.all(
        activeBalances.map(async (t: any) => {
          const meta = await getTokenMetadata(t.contractAddress, network);
          return {
            address: t.contractAddress,
            balance: t.tokenBalance, // Nilai HEX dari Alchemy
            symbol: meta.symbol,
            logo: meta.logo,
            decimals: meta.decimals,
            network: network
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