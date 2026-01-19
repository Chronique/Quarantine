"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { http, numberToHex } from "viem";
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

const safeHex = (value: any) => {
  if (value === undefined || value === null) return "0x0";
  return typeof value === "string" && value.startsWith("0x") ? value : numberToHex(value);
};

const cleanUserOpForRPC = (userOp: any) => ({
  sender: userOp.sender,
  nonce: safeHex(userOp.nonce),
  initCode: userOp.initCode || "0x",
  callData: userOp.callData,
  callGasLimit: safeHex(userOp.callGasLimit),
  verificationGasLimit: safeHex(userOp.verificationGasLimit),
  preVerificationGas: safeHex(userOp.preVerificationGas),
  maxFeePerGas: safeHex(userOp.maxFeePerGas),
  maxPriorityFeePerGas: safeHex(userOp.maxPriorityFeePerGas),
  paymasterAndData: userOp.paymasterAndData || "0x",
  signature: userOp.signature || "0x",
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
      if (!isConnected || !walletClient || !address || !publicClient) return;
      setIsLoading(true);
      try {
        const simpleAccount = await toSimpleSmartAccount({
          client: publicClient as any,
          owner: walletClient as any, 
          factoryAddress: "0x9406Cc6185a346906296840746125a0E44976454",
          entryPoint: { address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", version: "0.6" },
          // PERBAIKAN: Hapus properti 'chain' dari sini karena tidak didukung oleh tipe toSimpleSmartAccount
        });

        const client = createSmartAccountClient({
          account: simpleAccount,
          chain: base,
          bundlerTransport: http(`https://api.pimlico.io/v2/8453/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`),
          paymaster: {
            getPaymasterData: async (userOperation) => {
              const response = await fetch("/api/webhook/paymaster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  jsonrpc: "2.0", id: 1, method: "pm_getPaymasterData", 
                  params: [cleanUserOpForRPC(userOperation), "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", "0x"] 
                }),
              });
              const res = await response.json();
              if (res.error) throw new Error(res.error.message);
              return res.result; 
            },
          },
        });

        setSmartClient(client);
        setVaultAddress(simpleAccount.address);
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
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