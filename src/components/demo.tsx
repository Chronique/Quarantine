/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther } from "viem";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
import { 
  Copy, Trash, Wallet, CheckCircle, SystemRestart, 
  WarningTriangle, LogOut, Cart, RefreshDouble, ArrowRight
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
  const isSeamlessUser = !!frameContext?.context;
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);

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

  useEffect(() => {
    if ((activeTab === "swap" || activeTab === "wallet") && vaultAddress) {
      vaultScanner.scanTrash(vaultAddress, "base-mainnet"); 
    }
  }, [activeTab, vaultAddress]);

  const handleQuarantine = async (tokenAddress: string, symbol: string, balance: string) => {
    if (!vaultAddress || !address) return;
    try {
      sendTransaction({
        to: tokenAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [vaultAddress as `0x${string}`, BigInt(balance)],
        }),
      });
      alert(`Memindahkan ${symbol} ke Vault...`);
    } catch (err) { console.error(err); }
  };

  const handleSwapToEth = async (token: any) => {
    if (!smartAccountClient || !vaultAddress) return;
    setIsSwapping(token.address);
    try {
      // Pemanggilan rute /api/webhook/swap
      const res = await fetch(`/api/webhook/swap?sellToken=${token.address}&sellAmount=${token.balance}&takerAddress=${vaultAddress}`);
      const quote = await res.json();

      if (quote.error) throw new Error(quote.error);

      await smartAccountClient.sendTransactions({
        transactions: [
          {
            to: token.address as `0x${string}`,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
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
      vaultScanner.scanTrash(vaultAddress, "base-mainnet");
    } catch (err) {
      console.error(err);
      alert("Swap Gagal. Cek koneksi atau saldo ETH di Vault.");
    } finally { setIsSwapping(null); }
  };

  const handleWithdraw = async () => {
    if (!smartAccountClient || !address) return;
    const amount = (parseEther(vaultEthBalance) * BigInt(withdrawPercentage)) / 100n;
    try {
      await smartAccountClient.sendTransaction({ to: address, value: amount });
      alert("Withdraw berhasil!");
      fetchVaultBalance();
    } catch (err) { alert("Gagal. Vault butuh ETH untuk proses penarikan."); }
  };

  return (
    <div style={{ marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0, paddingBottom: '100px' }} className="bg-slate-50 min-h-screen font-sans text-left">
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 mt-1" />
              <div className="text-left">
                <p className="text-xs font-bold text-amber-800 text-left">Farcaster User Info</p>
                <p className="text-[10px] text-amber-700 leading-relaxed text-left">Kirim <b>$3 ETH</b> ke Vault Anda agar fitur Swap di Farcaster lancar (estimasi gas).</p>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
              <div className="relative z-10 text-left">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Your Personal Vault</p>
                <h2 className="text-2xl font-black mb-4">Quarantine Vault</h2>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                  <div className="truncate mr-4 text-left">
                    <p className="text-[10px] text-slate-400 mb-1">Vault Address (Base)</p>
                    <p className="font-mono text-xs truncate">{vaultAddress || "Loading..."}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(vaultAddress!); alert("Copied!"); }} className="p-3 bg-white/10 rounded-xl"><Copy width={18} /></button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><SystemRestart width={20} className={isScanning ? "animate-spin" : ""} /> Trash Scanner</h3>
              <button onClick={() => scanTrash()} disabled={isScanning || !isConnected} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 mb-4">
                {isScanning ? "Scanning..." : "Scan My Main Wallet"}
              </button>
              <div className="space-y-4">
                {tokens.map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                      <div className="text-left"><p className="font-bold text-slate-800 text-sm text-left">{token.symbol}</p></div>
                    </div>
                    <button onClick={() => handleQuarantine(token.address, token.symbol, token.balance)} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase">Quarantine</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "swap" && (
          <div className="mt-6 space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-slate-800 text-left"><RefreshDouble width={24} /><h3 className="text-lg font-bold">Swap Inside Vault</h3></div>
              <p className="text-xs text-slate-500 mb-6 text-left">Tukar koin yang ada di Vault menjadi ETH melalui 0x Protocol (Fee: 5%).</p>
              <div className="space-y-4">
                {vaultScanner.tokens.length > 0 ? vaultScanner.tokens.map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                      <div className="text-left"><p className="font-bold text-slate-800 text-sm text-left">{token.symbol}</p></div>
                    </div>
                    <button 
                      onClick={() => handleSwapToEth(token)}
                      disabled={isSwapping === token.address}
                      className="flex items-center gap-2 bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase shadow-md active:scale-95 disabled:bg-slate-300"
                    >
                      {isSwapping === token.address ? "Swapping..." : "Swap to ETH"} <ArrowRight width={12} />
                    </button>
                  </div>
                )) : <div className="text-center py-12 italic text-xs text-slate-400">Belum ada koin di dalam Vault.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-4 text-left">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2 text-left"><Wallet width={20} /> Saldo Vault</h3>
                <div className="text-3xl font-black text-slate-900 text-left">{Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-medium text-slate-400">ETH</span></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct} onClick={() => setWithdrawPercentage(pct)} className={`py-2 rounded-xl text-[10px] font-bold transition-all ${withdrawPercentage === pct ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>{pct === 100 ? 'MAX' : `${pct}%`}</button>
                ))}
              </div>
              <button onClick={handleWithdraw} disabled={Number(vaultEthBalance) === 0} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95"><LogOut width={18} /> Withdraw {withdrawPercentage}%</button>
            </div>
          </div>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}