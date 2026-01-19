"use client";

import { useState, useCallback } from "react";
import { useVault } from "~/components/providers/VaultProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { encodeFunctionData, parseUnits } from "viem";
import { usePublicClient } from "wagmi";

// Daftar token umum di Base untuk kemudahan UI
const COMMON_TOKENS = [
  { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  { symbol: "DEGEN", address: "0x4ed4E31Ea830066555aBb4274290132745026271", decimals: 18 },
  { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
];

const ERC20_ABI = [
  { name: "decimals", type: "function", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "approve", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];

export function SwapTokenAction() {
  const { smartAccountClient, vaultAddress } = useVault();
  const publicClient = usePublicClient();
  
  const [sellToken, setSellToken] = useState(COMMON_TOKENS[0].address);
  const [buyToken, setBuyToken] = useState("ETH"); // Target default adalah ETH (Native)
  const [amount, setAmount] = useState("1");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = useCallback(async () => {
    if (!smartAccountClient || !vaultAddress || !publicClient) {
      setError("Smart Account belum siap");
      return;
    }
    
    setIsPending(true);
    setError(null);

    try {
      // 1. Ambil desimal token secara dinamis jika bukan ETH
      let decimals = 18;
      if (sellToken !== "ETH" && sellToken !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        decimals = await publicClient.readContract({
          address: sellToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        }) as number;
      }

      const amountInWei = parseUnits(amount, decimals).toString();

      // 2. Ambil Quote v2 dari API Route
      const params = new URLSearchParams({
        sellToken: sellToken,
        buyToken: buyToken,
        sellAmount: amountInWei,
        taker: vaultAddress,
      });

      const res = await fetch(`/api/webhook/swap?${params.toString()}`);
      const quote = await res.json();
      
      if (!res.ok) {
        // Jika likuiditas tidak ada, 0x akan mengembalikan alasan di sini
        throw new Error(quote.reason === "INSUFFICIENT_ASSET_LIQUIDITY" 
          ? "Likuiditas tidak mencukupi untuk token ini" 
          : (quote.reason || "Gagal mengambil rute swap"));
      }

      const transactions = [];

      // 3. Approval Otomatis (Jika token yang dijual adalah ERC20)
      if (quote.issues?.allowance) {
        transactions.push({
          to: sellToken as `0x${string}`,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [quote.issues.allowance.spender as `0x${string}`, BigInt(amountInWei)],
          }),
        });
      }

      // 4. Eksekusi Swap (Data transaksi langsung dari 0x)
      transactions.push({
        to: quote.transaction.to as `0x${string}`,
        data: quote.transaction.data as `0x${string}`,
        value: BigInt(quote.transaction.value),
      });

      // 5. Batch Transaction: Gas fee dipotong dari Vault ETH
      const hash = await smartAccountClient.sendTransactions({
        transactions: transactions,
      });

      console.log("Swap Berhasil! Hash:", hash);
      alert(`Swap Berhasil! Transaksi diproses dari Vault.`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat swap");
      console.error("Swap Error:", err);
    } finally {
      setIsPending(false);
    }
  }, [smartAccountClient, vaultAddress, amount, sellToken, buyToken, publicClient]);

  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm mb-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-bold">Jual (Token Kontrak atau Pilih)</Label>
        <div className="flex gap-2 flex-wrap">
          {COMMON_TOKENS.map((t) => (
            <Button 
              key={t.symbol} 
              variant={sellToken === t.address ? "default" : "outline"}
              className="text-[10px] h-7"
              onClick={() => setSellToken(t.address)}
            >
              {t.symbol}
            </Button>
          ))}
        </div>
        <Input
          value={sellToken}
          onChange={(e) => setSellToken(e.target.value)}
          placeholder="0x... (Alamat Kontrak)"
          className="text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold">Jumlah</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1.0"
          className="text-xs"
        />
      </div>

      <Button 
        onClick={handleSwap} 
        disabled={isPending || !smartAccountClient}
        className="w-full text-xs font-bold"
      >
        {isPending ? "Mencari Likuiditas..." : "Swap via Vault"}
      </Button>
      
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-[10px] text-red-600 font-mono break-all text-center">{error}</p>
        </div>
      )}
    </div>
  );
}