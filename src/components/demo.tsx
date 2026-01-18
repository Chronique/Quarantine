/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther } from "viem";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
import { 
  Coins, 
  Copy, 
  Trash, 
  Wallet,
  CheckCircle,
  SystemRestart,
  WarningTriangle,
  LogOut,
  Cart
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
  const [selectedNetwork, setSelectedNetwork] = useState("base-mainnet");
  
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  // State baru untuk penarikan
  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100); // Default Max

  // 1. Fungsi untuk mengambil saldo ETH di Vault
  const fetchVaultBalance = async () => {
    if (!vaultAddress || !publicClient) return;
    try {
      const balance = await publicClient.getBalance({ address: vaultAddress });
      setVaultEthBalance(formatEther(balance));
    } catch (err) {
      console.error("Gagal mengambil saldo vault:", err);
    }
  };

  useEffect(() => {
    if (vaultAddress) {
      fetchVaultBalance();
    }
  }, [vaultAddress, activeTab]);

  useEffect(() => {
    if (activeTab === "wallet" && vaultAddress) {
      vaultScanner.scanTrash(vaultAddress, "base-mainnet"); 
    }
  }, [activeTab, vaultAddress]);

  const copyVaultAddress = () => {
    if (vaultAddress) {
      navigator.clipboard.writeText(vaultAddress);
      alert("Alamat Vault berhasil disalin!");
    }
  };

  // 2. Fungsi Withdrawal dengan Logika Persentase
  const handleWithdraw = async () => {
    if (!smartAccountClient || !address || !vaultAddress) {
      alert("Vault belum siap.");
      return;
    }

    const balanceInWei = parseEther(vaultEthBalance);
    if (balanceInWei === 0n) {
      alert("Saldo Vault kosong.");
      return;
    }

    // Hitung jumlah berdasarkan persentase
    const amountToWithdraw = (balanceInWei * BigInt(withdrawPercentage)) / 100n;

    try {
      alert(`Menarik ${withdrawPercentage}% saldo (${formatEther(amountToWithdraw)} ETH) ke wallet utama Anda...`);
      
      const hash = await smartAccountClient.sendTransaction({
        to: address as `0x${string}`,
        value: amountToWithdraw,
      });

      console.log("Withdraw Hash:", hash);
      alert("Penarikan berhasil diajukan!");
      fetchVaultBalance(); // Refresh saldo
    } catch (err) {
      console.error("Withdrawal gagal:", err);
      alert("Gagal melakukan penarikan. Pastikan saldo gas mencukupi.");
    }
  };

  return (
    <div style={{ 
      marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0,
      paddingBottom: '100px'
    }} className="bg-slate-50 min-h-screen font-sans">
      
      <div className="w-full max-w-lg mx-auto p-4 text-left">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 mt-1" />
              <div>
                <p className="text-xs font-bold text-amber-800">Peringatan Saldo Gas</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Disarankan mentransfer minimal <b>$3 (ETH)</b> ke Vault Base Anda untuk kelancaran operasional.
                </p>
              </div>
            </div>

            {/* CARD VAULT */}
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Your Personal Vault</p>
                <h2 className="text-2xl font-black mb-4">Quarantine Vault</h2>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                  <div className="truncate mr-4">
                    <p className="text-[10px] text-slate-400 mb-1">Vault Address (Base)</p>
                    <p className="font-mono text-sm truncate">{vaultLoading ? "Generating..." : vaultAddress}</p>
                  </div>
                  <button onClick={copyVaultAddress} className="p-3 bg-white/10 rounded-xl"><Copy width={18} /></button>
                </div>
              </div>
            </div>

            {/* SCANNER */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-6"><SystemRestart width={20} /> Trash Scanner</h3>
              <button onClick={() => scanTrash(address, selectedNetwork)} disabled={isScanning} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 mb-4">
                {isScanning ? "Scanning..." : `Scan Wallet (${selectedNetwork.split('-')[0].toUpperCase()})`}
              </button>
              {/* List tokens tetap sama seperti sebelumnya */}
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-4 text-left">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Wallet width={20} /> Saldo Vault</h3>
                <div className="text-3xl font-black text-slate-900">{Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-medium text-slate-400">ETH</span></div>
              </div>

              {/* SELECTOR PERSENTASE */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setWithdrawPercentage(pct)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                      withdrawPercentage === pct 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={handleWithdraw}
                disabled={Number(vaultEthBalance) === 0}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                <LogOut width={18} /> Withdraw {withdrawPercentage}%
              </button>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-sm font-bold text-slate-800 mb-4">Daftar Koin Karantina</p>
                <div className="space-y-3">
                  {vaultScanner.tokens.length > 0 ? vaultScanner.tokens.map((token: any) => (
                    <div key={token.address} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                       <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-500 text-xs">{token.symbol?.[0]}</div>
                        <p className="font-bold text-sm text-slate-700">{token.symbol}</p>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">In Vault</p>
                    </div>
                  )) : <div className="text-center py-6 opacity-40 italic text-[10px]">Belum ada koin di dalam vault.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}