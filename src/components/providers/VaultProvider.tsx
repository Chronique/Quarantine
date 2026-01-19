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

// Fungsi pembantu untuk membersihkan UserOperation agar payload tidak berat
const cleanUserOp = (userOp: any) => {
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: userOp.callGasLimit,
    verificationGasLimit: userOp.verificationGasLimit,
    preVerificationGas: userOp.preVerificationGas,
    maxFeePerGas: userOp.maxFeePerGas,
    maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  };
};

export const VaultProvider = ({ children }: { children: React.ReactNode }) => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const [smartClient, setSmartClient] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initSmartAccount = async () => {
      if (!isConnected || !walletClient || !address || !publicClient) return;

      setIsLoading(true);
      try {
        // 1. Inisialisasi Simple Smart Account (EntryPoint v0.6)
        const simpleAccount = await toSimpleSmartAccount({
          client: publicClient as any,
          owner: walletClient as any, 
          factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
          entryPoint: {
            address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
            version: "0.6"
          },
        });

        // 2. Konfigurasi Smart Account Client dengan Pimlico
        const client = createSmartAccountClient({
          account: simpleAccount,
          chain: base,
          bundlerTransport: http(
            `https://api.pimlico.io/v2/8453/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
          ),
          paymaster: {
            // PERBAIKAN: getPaymasterData langsung di bawah paymaster (bukan nested)
            getPaymasterData: async (userOperation: any) => {
              const response = await fetch("/api/webhook/paymaster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  jsonrpc: "2.0",
                  id: 1,
                  method: "pm_getPaymasterData", 
                  params: [
                    cleanUserOp(userOperation),
                    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", 
                    {}
                  ] 
                }, (key, value) => 
                  // Penanganan serialisasi BigInt untuk mencegah error
                  typeof value === 'bigint' ? value.toString() : value
                ),
              });
              
              const res = await response.json();
              
              if (res.error) {
                console.error("Paymaster RPC Error:", res.error);
                throw new Error(res.error.message || "Gagal validasi paymaster");
              }

              return res.result; 
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