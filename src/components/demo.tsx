/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther } from "viem";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
import { 
  Copy, Trash, Wallet, CheckCircle, SystemRestart, 
  WarningTriangle, LogOut, RefreshDouble, ArrowRight, List
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
      vaultScanner.scanTrash(vaultAddress); 
    }
  }, [activeTab, vaultAddress]);

  // Fungsi Pindahkan Satu per Satu
  const handleQuarantine = async (token: any) => {
    if (!vaultAddress || !address) return;
    try {
      sendTransaction({
        to: token.address as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [vaultAddress as `0x${string}`, BigInt(token.balance)],
        }),
      });
    } catch (err) { console.error(err); }
  };

  // FUNGSI SELECT ALL QUARANTINE
  const handleQuarantineAll = async () => {
    if (tokens.length === 0) return;
    alert(`Memproses pemindahan ${tokens.length} koin. Silahkan konfirmasi di wallet Anda.`);
    for (const token of tokens) {
      await handleQuarantine(token);
    }
  };

  const handleSwapToEth = async (token: any) => {
    if (!smartAccountClient || !vaultAddress) return;
    setIsSwapping(token.address);
    try {
      const res = await fetch(`/api/webhook/swap?sellToken=${token.address}&sellAmount=${token.balance}&takerAddress=${vaultAddress}`);
      const quote = await res.json();
      if (quote.error) throw new Error(quote.error);

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
    } catch (err) { alert("Gagal. Cek saldo ETH di Vault."); }
    finally { setIsSwapping(null); }
  };

  return (
    <div style={{ marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0, paddingBottom: '100px' }} className="bg-slate-50 min-h-screen font-sans text-left">
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
               <p className="text-slate-400 text-xs font-bold uppercase mb-1">Personal Vault (Base)</p>
               <p className="font-mono text-xs truncate mb-4">{vaultAddress || "Loading..."}</p>
               <button onClick={() => scanTrash()} disabled={isScanning} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95">
                 {isScanning ? "Scanning..." : "Scan My Main Wallet"}
               </button>
            </div>

            {/* TOMBOL SELECT ALL */}
            {tokens.length > 0 && (
              <div className="flex justify-between items-center px-2">
                <p className="text-xs font-bold text-slate-500">{tokens.length} Koin Ditemukan</p>
                <button onClick={handleQuarantineAll} className="flex items-center gap-2 bg-blue-100 text-blue-700 text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-200 transition-all">
                  <CheckCircle width={14} /> QUARANTINE ALL
                </button>
              </div>
            )}

            <div className="space-y-4">
              {tokens.map((token: any) => (
                <div key={token.address} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                  <div className="flex items-center gap-3">
                    {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                    <div className="text-left">
                      <p className="font-bold text-slate-800 text-sm">{token.symbol}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{token.balance.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <button onClick={() => handleQuarantine(token)} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase">Quarantine</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "swap" && (
          <div className="mt-6 space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-slate-800 text-left"><RefreshDouble width={24} /><h3 className="text-lg font-bold">Swap Liquidity Only</h3></div>
              
              <div className="space-y-4">
                {/* FILTER: Hanya koin dengan Likuiditas > $1 */}
                {vaultScanner.tokens
                  .filter((t: any) => t.liquidityUSD > 1) 
                  .map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 text-left">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-xs font-bold">{token.symbol?.[0]}</div>}
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{token.symbol}</p>
                        <p className="text-[9px] text-blue-500 font-bold uppercase">Liquid: ${Number(token.liquidityUSD).toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleSwapToEth(token)} disabled={isSwapping === token.address} className="flex items-center gap-2 bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase shadow-md active:scale-95 disabled:bg-slate-300">
                      {isSwapping === token.address ? "..." : "Swap to ETH"} <ArrowRight width={12} />
                    </button>
                  </div>
                ))}
                
                {vaultScanner.tokens.filter((t: any) => t.liquidityUSD > 1).length === 0 && (
                  <div className="text-center py-12 italic text-xs text-slate-400">Pindahkan koin yang memiliki likuiditas ke Vault untuk menukar.</div>
                )}
              </div>
            </div>
          </div>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}