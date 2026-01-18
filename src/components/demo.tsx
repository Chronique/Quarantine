/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther } from "viem";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
import { 
  Copy, Trash, Wallet, CheckCircle, SystemRestart, 
  WarningTriangle, LogOut, RefreshDouble, ArrowRight
} from "iconoir-react";

import { useScanner } from '../hooks/useScanner';
import { useVault } from './providers/VaultProvider'; 
import { TopBar } from "~/components/top-bar";
import { BottomNavigation } from "~/components/bottom-navigation";
import { TabType } from "~/types";

export default function Demo() {
  const frameContext = useFrameContext();
  const { address, isConnected } = useAccount();
  const { sendTransaction } = useSendTransaction();
  const publicClient = usePublicClient();
  const { vaultAddress, isLoading: vaultLoading, smartAccountClient } = useVault();
  
  const [activeTab, setActiveTab] = useState<TabType>("actions");
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);

  // Ambil saldo ETH Vault
  const fetchVaultBalance = useCallback(async () => {
    if (!vaultAddress || !publicClient) return;
    try {
      const balance = await publicClient.getBalance({ address: vaultAddress });
      setVaultEthBalance(formatEther(balance));
    } catch (err) { console.error(err); }
  }, [vaultAddress, publicClient]);

  useEffect(() => {
    if (vaultAddress) fetchVaultBalance();
  }, [vaultAddress, activeTab, fetchVaultBalance]);

  // Scan Vault saat di tab Swap atau Wallet
  useEffect(() => {
    if ((activeTab === "swap" || activeTab === "wallet") && vaultAddress) {
      vaultScanner.scanTrash(vaultAddress); 
    }
  }, [activeTab, vaultAddress]);

  const handleSwapToEth = async (token: any) => {
    if (!smartAccountClient || !vaultAddress || !token.address) return;
    setIsSwapping(token.address);
    try {
      const res = await fetch(`/api/webhook/swap?sellToken=${token.address}&sellAmount=${token.balance}&takerAddress=${vaultAddress}`);
      const quote = await res.json();
      if (quote.error) throw new Error(quote.error);

      // Batch Approve + Swap menggunakan Smart Account
      await smartAccountClient.sendTransactions({
        transactions: [
          {
            to: token.address as `0x${string}`,
            data: encodeFunctionData({
              abi: erc20Abi, functionName: "approve",
              args: [quote.allowanceTarget as `0x${string}`, BigInt(token.balance)],
            }),
          },
          {
            to: quote.to as `0x${string}`,
            data: quote.data as `0x${string}`,
            value: BigInt(quote.value),
          },
        ],
      });
      alert("Swap Berhasil!");
      fetchVaultBalance();
      vaultScanner.scanTrash(vaultAddress);
    } catch (err) { alert("Swap Gagal. Pastikan Vault punya ETH untuk gas."); }
    finally { setIsSwapping(null); }
  };

  return (
    <div style={{ marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0, paddingBottom: '100px' }} className="bg-slate-50 min-h-screen font-sans text-left">
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            {/* ALERT GAS FEE */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 mt-1" />
              <div className="text-left">
                <p className="text-xs font-bold text-amber-800">Khusus Farcaster</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">Kirim <b>$3 ETH</b> ke Vault agar fitur Swap lancar.</p>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative overflow-hidden">
               <p className="text-slate-400 text-xs font-bold uppercase mb-1">Vault Address (Base)</p>
               <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                  <p className="font-mono text-xs truncate">{vaultAddress || "Loading..."}</p>
                  <button onClick={() => { navigator.clipboard.writeText(vaultAddress!); alert("Copied!"); }} className="p-2"><Copy width={18}/></button>
               </div>
            </div>

            <button onClick={() => scanTrash()} disabled={isScanning} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg">
              {isScanning ? "Scanning..." : "Scan My Main Wallet"}
            </button>

            <div className="space-y-4">
              {tokens.map((token: any) => (
                <div key={token.address} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                      <p className="font-bold text-slate-800 text-sm">{token.symbol}</p>
                   </div>
                   <button onClick={() => {}} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase">Quarantine</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "swap" && (
          <div className="mt-6 space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><RefreshDouble width={20}/> Swap Inside Vault</h3>
              <p className="text-xs text-slate-400 mb-6 italic">Hanya menampilkan koin dengan likuiditas aktif.</p>
              <div className="space-y-4 text-left">
                {vaultScanner.tokens
                  .filter((t: any) => t.liquidityUSD > 1) // Filter Likuiditas > $1
                  .map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                      <div className="text-left">
                        <p className="font-bold text-slate-800 text-sm">{token.symbol}</p>
                        <p className="text-[9px] text-blue-500 font-bold">Liq: ${Number(token.liquidityUSD).toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleSwapToEth(token)} disabled={isSwapping === token.address} className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase shadow-md active:scale-95 disabled:bg-slate-300">
                      {isSwapping === token.address ? "..." : "Swap to ETH"} <ArrowRight width={12} />
                    </button>
                  </div>
                ))}
                {vaultScanner.tokens.filter((t: any) => t.liquidityUSD > 1).length === 0 && (
                  <div className="text-center py-10 text-xs text-slate-400 italic">Tidak ada koin dengan likuiditas cukup untuk swap.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-4 text-left">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Wallet width={20} /> Saldo Vault</h3>
              <div className="text-3xl font-black text-slate-900 mb-6">{Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-medium text-slate-400">ETH</span></div>
              <button onClick={() => {}} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95"><LogOut width={18} /> Withdraw All</button>
            </div>
          </div>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}