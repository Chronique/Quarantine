"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http } from "viem";
import { base } from "viem/chains";

interface VaultContextType {
  smartAccountClient: any | null;
  vaultAddress: `0x${string}` | null;
  isLoading: boolean;
}

const VaultContext = createContext<VaultContextType>({
  smartAccountClient: null,
  vaultAddress: null,
  isLoading: false,
});

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const [smartClient, setSmartClient] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initSmartAccount = async () => {
      // Menggunakan logika pengecekan dari kode lama
      if (!isConnected || !walletClient || !address || !publicClient) return;

      setIsLoading(true);
      try {
        // 1. Definisikan Smart Account (Menggunakan owner: walletClient langsung seperti kode lama)
        const simpleAccount = await toSimpleSmartAccount({
          client: publicClient as any,
          owner: walletClient as any, 
          factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
          entryPoint: {
            address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
            version: "0.6"
          },
        });

        // 2. Hubungkan dengan Bundler Pimlico
        const client = createSmartAccountClient({
          account: simpleAccount,
          chain: base,
          bundlerTransport: http(
            `https://api.pimlico.io/v2/8453/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
          ),
          // Menggunakan endpoint Paymaster yang baru: /api/webhook/paymaster
          paymaster: {
            getPaymasterData: async (userOperation) => {
              const response = await fetch("/api/webhook/paymaster", {
                method: "POST",
                body: JSON.stringify({ 
                  method: "pm_getPaymasterData", 
                  params: [
                    userOperation, 
                    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", 
                    {}
                  ] 
                }),
              });
              
              const res = await response.json();
              return res;
            },
          },
        });

        setSmartClient(client);
        setVaultAddress(simpleAccount.address);
      } catch (error) {
        console.error("Gagal inisialisasi Smart Account:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initSmartAccount();
  }, [isConnected, walletClient, address, publicClient]);

  return (
    <VaultContext.Provider value={{ smartAccountClient: smartClient, vaultAddress, isLoading }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => useContext(VaultContext);