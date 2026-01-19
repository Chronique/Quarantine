"use client";

import { useState, useCallback } from "react";
import { useVault } from "~/components/providers/VaultProvider"; //
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { encodeFunctionData, parseUnits, parseEther } from "viem";

const DEFAULT_RECIPIENT = "0x4fba95e4772be6d37a0c931D00570Fe2c9675524";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

export function SendTokenAction() {
  const { smartAccountClient, vaultAddress } = useVault(); //
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>(DEFAULT_RECIPIENT);
  const [amount, setAmount] = useState<string>("0.01");
  const [tokenType, setTokenType] = useState<"ETH" | "USDC">("ETH");
  const [isPending, setIsPending] = useState(false);

  const handleWithdraw = useCallback(async (): Promise<void> => {
    if (!smartAccountClient) {
      setError("Smart Account belum siap");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsPending(true);
    
    try {
      let hash;

      if (tokenType === "ETH") {
        // Penarikan Native ETH
        hash = await smartAccountClient.sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: parseEther(amount), // Konversi ke Wei
        });
      } else {
        // Penarikan USDC (ERC20)
        const callData = encodeFunctionData({
          abi: [
            {
              name: "transfer",
              type: "function",
              inputs: [
                { name: "recipient", type: "address" },
                { name: "amount", type: "uint256" },
              ],
            },
          ],
          args: [recipientAddress as `0x${string}`, parseUnits(amount, 6)], // USDC Base pakai 6 desimal
        });

        hash = await smartAccountClient.sendTransaction({
          to: USDC_ADDRESS,
          data: callData,
        });
      }
      
      setSuccess(`Berhasil! Hash: ${hash.slice(0, 10)}...`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Gagal withdraw";
      setError(errorMessage);
    } finally {
      setIsPending(false);
    }
  }, [smartAccountClient, recipientAddress, amount, tokenType]);

  return (
    <div className="mb-4 p-4 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
      <div className="mb-4">
        <p className="text-[10px] text-gray-500 font-bold uppercase">Vault Wallet (Smart Account)</p>
        <code className="text-[10px] bg-zinc-100 dark:bg-zinc-800 p-1 rounded break-all">
          {vaultAddress || "Memuat..."}
        </code>
      </div>

      {/* Pilihan Token */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant={tokenType === "ETH" ? "default" : "outline"} 
          onClick={() => setTokenType("ETH")}
          className="flex-1 text-xs h-8"
        >
          ETH
        </Button>
        <Button 
          variant={tokenType === "USDC" ? "default" : "outline"} 
          onClick={() => setTokenType("USDC")}
          className="flex-1 text-xs h-8"
        >
          USDC
        </Button>
      </div>
      
      <div className="mb-3">
        <Label className="text-xs font-semibold mb-1 block">Alamat Penerima</Label>
        <Input
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="text-xs"
          placeholder="0x..."
        />
      </div>
      
      <div className="mb-4">
        <Label className="text-xs font-semibold mb-1 block">Jumlah {tokenType}</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-xs"
          placeholder="0.0"
          step="0.001"
        />
      </div>
      
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3">
          <p className="text-[10px] text-red-600 font-mono break-all">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
          <p className="text-[10px] text-green-600 font-mono">{success}</p>
        </div>
      )}

      <Button 
        onClick={handleWithdraw} 
        disabled={isPending || !smartAccountClient}
        className="w-full"
      >
        {isPending ? "Memproses..." : `Withdraw ${amount} ${tokenType}`}
      </Button>
    </div>
  );
}