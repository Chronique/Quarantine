import { useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

export function useScanner() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi internal untuk mengambil metadata token (Simbol, Nama, Logo)
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

  // Tambahkan parameter targetAddress dan network (default ke base-mainnet)
  const scanTrash = async (targetAddress?: string, network: string = 'base-mainnet') => {
    const addrToScan = targetAddress || address;
    if (!addrToScan) return;

    setIsLoading(true);
    setTokens([]); // Reset list koin sebelum scan baru

    try {
      // Gunakan parameter network untuk menentukan endpoint Alchemy
      const alchemyUrl = `https://${network}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_TOKEN_API}`;
      
      const res = await axios.post(alchemyUrl, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [addrToScan],
        id: 42
      });

      const rawBalances = res.data.result.tokenBalances;

      // Filter koin yang memiliki saldo (tidak 0)
      const activeBalances = rawBalances.filter((t: any) => 
        t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      // Ambil metadata untuk setiap koin secara paralel
      const detailedTokens = await Promise.all(
        activeBalances.map(async (t: any) => {
          const meta = await getTokenMetadata(t.contractAddress, network);
          return {
            address: t.contractAddress,
            balance: t.tokenBalance,
            symbol: meta.symbol,
            logo: meta.logo,
            decimals: meta.decimals,
            network: network // Simpan informasi jaringan di tiap token
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