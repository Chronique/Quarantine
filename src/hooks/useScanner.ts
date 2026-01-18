import { useState } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

export function useScanner() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scanTrash = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      // Step 1: Ambil token di wallet (Gunakan Alchemy/Moralis untuk hasil akurat)
      // Di sini kita pakai contoh token "Degen" & "Virtual" yang sering ada di Base
      const commonTrashAddresses = [
        '0x4ed4e2b910c431820b5d9bc99c4c514803db4af9', // DEGEN
        '0x0b3e3284558222230231cc2b3e741d73c17b5993'  // VIRTUAL
      ];

      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${commonTrashAddresses.join(',')}`);
      
      const pairs = response.data.pairs?.filter((p: any) => p.chainId === 'base') || [];
      setTokens(pairs);
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { scanTrash, tokens, isLoading };
}