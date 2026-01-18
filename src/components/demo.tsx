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
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);

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

  // Auto-scan isi vault saat tab SWAP atau WALLET dibuka
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

  const handleWithdraw = async () => {
    if (!smartAccountClient || !address) return;
    const amount = (parseEther(vaultEthBalance) * BigInt(withdrawPercentage)) / 100n;
    try {
      await smartAccountClient.sendTransaction({ to: address, value: amount });
      alert("Withdraw berhasil!");
      fetchVaultBalance();
    } catch (err) { alert("Gagal. Cek saldo ETH di Vault."); }
  };

  return (
    <div style={{ marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0, paddingBottom: '100px' }} className="bg-slate-50 min-h-screen font-sans text-left">
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 mt-1" />
              <div>
                <p className="text-xs font-bold text-amber-800">Masalah Gas Farcaster?</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Meskipun EOA Anda punya ETH, <b>Vault memerlukan ETH sendiri</b> untuk memproses swap. Kirim $3 ETH ke alamat Vault di bawah agar fitur di Farcaster lancar.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden text-left">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Your Personal Vault</p>
                <h2 className="text-2xl font-black mb-4">Quarantine Vault</h2>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
                  <div className="truncate mr-4"><p className="text-[10px] text-slate-400 mb-1">Vault Address (Base)</p><p className="font-mono text-sm truncate">{vaultAddress || "Loading..."}</p></div>
                  <button onClick={() => { navigator.clipboard.writeText(vaultAddress!); alert("Copied!"); }} className="p-3 bg-white/10 rounded-xl"><Copy width={18} /></button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><SystemRestart width={20} className={isScanning ? "animate-spin" : ""} /> Trash Scanner</h3>
              <button onClick={() => scanTrash(address, "base-mainnet")} disabled={isScanning} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 mb-4">
                {isScanning ? "Scanning..." : "Scan My Main Wallet"}
              </button>
              <div className="space-y-4">
                {tokens.map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                      <div className="text-left"><p className="font-bold text-slate-800 text-sm">{token.symbol}</p></div>
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
              <div className="flex items-center gap-2 mb-6 text-slate-800"><RefreshDouble width={24} /><h3 className="text-lg font-bold">Auto Swap Trash</h3></div>
              <p className="text-xs text-slate-500 mb-6">Koin di bawah sudah ada di dalam Vault dan siap di-swap menjadi ETH secara gasless.</p>
              <div className="space-y-4">
                {vaultScanner.tokens.length > 0 ? vaultScanner.tokens.map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                      <div className="text-left"><p className="font-bold text-slate-800 text-sm">{token.symbol}</p></div>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase">Swap to ETH <ArrowRight width={12} /></button>
                  </div>
                )) : <div className="text-center py-12 italic text-xs text-slate-400">Pindahkan koin dari tab Actions dulu.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 text-left">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Wallet width={20} /> Saldo Vault</h3>
              <div className="text-3xl font-black text-slate-900 mb-6">{Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-medium text-slate-400">ETH</span></div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct} onClick={() => setWithdrawPercentage(pct)} className={`py-2 rounded-xl text-[10px] font-bold transition-all ${withdrawPercentage === pct ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>{pct === 100 ? 'MAX' : `${pct}%`}</button>
                ))}
              </div>
              <button onClick={handleWithdraw} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95"><LogOut width={18} /> Withdraw {withdrawPercentage}%</button>
            </div>
          </div>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}