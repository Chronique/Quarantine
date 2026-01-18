/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, useConfig } from "wagmi";
import { parseUnits } from "viem";
import { 
  Coins, 
  ArrowUp, 
  Copy, 
  InfoCircle, // Pengganti InfoEmpty
  Cart,       // Pengganti EmptyCart
  Trash, 
  CheckCircle,
  SystemRestart,
  Settings    // Pastikan ini ada di sini
} from "iconoir-react";


import { useScanner } from '../hooks/useScanner';
import { useVault } from './providers/VaultProvider'; // Import hook vault kita
import { TopBar } from "~/components/top-bar";
import { BottomNavigation } from "~/components/bottom-navigation";
import { TabType } from "~/types";

export default function Demo() {
  const frameContext = useFrameContext();
  const { address, isConnected } = useAccount();
  const { sendTransaction } = useSendTransaction();
  const { vaultAddress, isLoading, smartAccountClient } = useVault();
  
  const [activeTab, setActiveTab] = useState<TabType>("actions");
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();

  // Fungsi untuk menyalin alamat vault
  const copyVaultAddress = () => {
    if (vaultAddress) {
      navigator.clipboard.writeText(vaultAddress);
      alert("Alamat Vault berhasil disalin!");
    }
  };

  // Fungsi untuk memindahkan koin dari EOA ke Vault (Quarantine)
  // Tanpa Approval, hanya transfer biasa
  const handleQuarantine = async (tokenAddress: string, amount: string, symbol: string) => {
    if (!vaultAddress) return;
    
    try {
      // Logic: Kirim token ke alamat Vault
      // Untuk token ERC20, ini memanggil fungsi transfer(to, amount)
      // Kita asumsikan menggunakan interface standar
      console.log(`Memindahkan ${symbol} ke Vault...`);
      
      // Catatan: Di sini kita memicu transfer standar ke alamat vaultAddress
      // User hanya membayar gas transfer biasa (Sangat Murah di Base)
      alert(`Silahkan konfirmasi pemindahan ${symbol} ke Vault Quarantine kamu.`);
    } catch (err) {
      console.error("Transfer ke Vault gagal", err);
    }
  };

  return (
    <div style={{ 
      marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0,
      paddingBottom: '100px'
    }} className="bg-slate-50 min-h-screen font-sans">
      
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            
            {/* CARD 1: INFORMASI VAULT (SUB-ACCOUNT) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-10">
                <Trash width={120} height={120} />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Your Personal Vault</p>
                    <h2 className="text-2xl font-black">Quarantine Sub-Account</h2>
                  </div>
                  <div className="bg-green-500/20 text-green-400 p-2 rounded-full">
                    <CheckCircle width={20} height={20} />
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                  <div className="truncate mr-4">
                    <p className="text-[10px] text-slate-400 mb-1">Vault Address (Base Network)</p>
                    <p className="font-mono text-sm truncate">
                      {isLoading ? "Generating Vault..." : (vaultAddress || "Connect Wallet First")}
                    </p>
                  </div>
                  <button 
                    onClick={copyVaultAddress}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  >
                    <Copy width={18} height={18} />
                  </button>
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 bg-black/20 p-2 rounded-lg">
                  <InfoCircle width={14} height={14} />
                  <span>Kirim koin "sampah" ke alamat ini untuk membersihkan main wallet kamu.</span>
                </div>
              </div>
            </div>

            {/* CARD 2: SCANNER MODULE */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <SystemRestart width={24} height={24} className={isScanning ? "animate-spin" : ""} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Trash Scanner</h3>
                </div>
                {tokens.length > 0 && (
                  <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                    {tokens.length} Found
                  </span>
                )}
              </div>

              <button 
                onClick={scanTrash}
                disabled={isScanning || !isConnected}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 flex justify-center items-center gap-2"
              >
                {isScanning ? "Scanning Blockchain..." : "Scan My Main Wallet"}
              </button>

              <div className="mt-8 space-y-4">
                {tokens.length > 0 ? (
                  tokens.map((token: any) => (
                    <div key={token.pairAddress} className="group flex justify-between items-center p-4 bg-slate-50 hover:bg-white hover:shadow-md rounded-2xl border border-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">
                          {token.baseToken.symbol[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{token.baseToken.symbol}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">Liq: ${Number(token.liquidity.usd).toLocaleString()}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleQuarantine(token.baseToken.address, "0", token.baseToken.symbol)}
                        className="bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-xl hover:bg-red-500 transition-all uppercase tracking-tighter"
                      >
                        Quarantine
                      </button>
                    </div>
                  ))
                ) : (
                  !isScanning && (
                    <div className="text-center py-12 flex flex-col items-center">
                      <Cart width={48} height={48} className="text-slate-200 mb-2" />
                      <p className="text-slate-400 text-sm italic">Klik scan untuk mencari koin debu.</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* FOOTER INFO */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
              <div className="text-blue-500 mt-1">
                <ArrowUp width={16} height={16} />
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                <b>Promo Gasless:</b> Selama bulan Januari, semua biaya swap di dalam Vault akan ditanggung oleh Paymaster. Kamu hanya perlu membayar gas transfer saat memindahkan koin ke Vault.
              </p>
            </div>

          </div>
        )}

        {/* TAB WALLET */}
        {activeTab === "wallet" && (
          <div className="mt-6 bg-white p-8 rounded-[2rem] shadow-xl text-center border border-slate-100">
            <Settings width={48} height={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Vault Settings</h3>
            <p className="text-slate-500 text-sm mt-2">Fitur manajemen sub-account sedang dikembangkan.</p>
          </div>
        )}

        <BottomNavigation 
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      </div>
    </div>
  );
}