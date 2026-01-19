"use client";

import { useState, useCallback } from "react";
import { useVault } from "~/components/providers/VaultProvider"; //
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { encodeFunctionData, parseUnits } from "viem";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

export function SwapTokenAction() {
  const { smartAccountClient, vaultAddress } = useVault(); //
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [amount, setAmount] = useState("1"); // Default 1 USDC

  const handleSwap = useCallback(async () => {
    if (!smartAccountClient || !vaultAddress) {
      setError("Smart Account belum siap. Pastikan sudah terkoneksi.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      // 1. Ambil Quote dari API Route Anda
      const params = new URLSearchParams({
        buyToken: "ETH", // Menukar ke ETH
        sellToken: USDC_ADDRESS,
        sellAmount: parseUnits(amount, 6).toString(), // USDC Base = 6 desimal
        takerAddress: vaultAddress, // Alamat Vault sebagai eksekutor
      });

      const response = await fetch(`/api/webhook/swap?${params.toString()}`);
      const quote = await response.json();

      if (!response.ok) throw new Error(quote.reason || "Gagal mengambil quote");

      // 2. Siapkan Batch Transaksi
      const transactions = [];

      // A. Transaksi Approval: Izin agar 0x bisa mengambil USDC dari Vault
      transactions.push({
        to: USDC_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: [{
            name: "approve",
            type: "function",
            inputs: [{ type: "address" }, { type: "uint256" }],
          }],
          args: [quote.allowanceTarget, parseUnits(amount, 6)],
        }),
      });

      // B. Transaksi Swap: Data asli dari 0x API
      transactions.push({
        to: quote.to as `0x${string}`,
        data: quote.data as `0x${string}`,
        value: BigInt(quote.value),
      });

      // 3. Kirim Batch lewat Smart Account (Hanya perlu 1x Sign di Farcaster)
      const hash = await smartAccountClient.sendTransactions({
        transactions: transactions,
      });

      console.log("Swap Berhasil! Hash:", hash);
      alert(`Swap Berhasil! Hash: ${hash}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat swap");
    } finally {
      setIsPending(false);
    }
  }, [smartAccountClient, vaultAddress, amount]);

  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm mb-4">
      <Label className="text-xs font-bold mb-2 block">Swap USDC ke ETH (Vault Account)</Label>
      <div className="flex gap-2 mb-4">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Jumlah USDC"
          className="text-xs"
        />
        <Button 
          onClick={handleSwap} 
          disabled={isPending || !smartAccountClient}
          className="text-xs"
        >
          {isPending ? "Memproses..." : "Swap Sekarang"}
        </Button>
      </div>
      
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-[10px] text-red-600 font-mono break-all">{error}</p>
        </div>
      )}

      <div className="mt-2">
        <p className="text-[10px] text-gray-500 italic">
          *Transaksi ini akan menggunakan saldo di Vault ({vaultAddress?.slice(0,6)}...)
        </p>
      </div>
    </div>
  );
}