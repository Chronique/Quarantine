/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction } from "wagmi";
import { 
  Coins, 
  ArrowUp, 
  Copy, 
  InfoCircle, 
  Cart, 
  Trash, 
  Wallet,
  CheckCircle,
  SystemRestart,
  Settings,
  NavArrowDown
} from "iconoir-react";

import { useScanner } from '../hooks/useScanner';
import { useVault } from './providers/VaultProvider'; 
import { TopBar } from "~/components/top-bar";
import { BottomNavigation } from "~/components/bottom-navigation";
import { TabType } from "~/types";

export default function Demo() {
  const frameContext = useFrameContext();
  const { address, isConnected } = useAccount();
  const { vaultAddress, isLoading: vaultLoading } = useVault();
  
  const [activeTab, setActiveTab] = useState<TabType>("actions");
  
  // State untuk menyimpan jaringan yang dipilih user
  const [selectedNetwork, setSelectedNetwork] = useState("base-mainnet");
  
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  const copyVaultAddress = () => {
    if (vaultAddress) {
      navigator.clipboard.writeText(vaultAddress);
      alert("Alamat Vault berhasil disalin!");
    }
  };

  // Scan Vault otomatis saat tab wallet dibuka (Hanya di jaringan Base karena Vault ada di Base)
  useEffect(() => {
    if (activeTab === "wallet" && vaultAddress) {
      vaultScanner.scanTrash(vaultAddress, "base-mainnet"); 
    }
  }, [activeTab, vaultAddress]);

  const handleQuarantine = async (tokenAddress: string, symbol: string) => {
    if (!vaultAddress) return;
    alert(`Fitur pemindahan ${symbol} ke Vault di jaringan ${selectedNetwork} sedang disiapkan.`);
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
            {/* CARD VAULT INFO */}
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
                  <div className="truncate mr-4 text-left">
                    <p className="text-[10px] text-slate-400 mb-1">Vault Address (Base Network)</p>
                    <p className="font-mono text-sm truncate">
                      {vaultLoading ? "Generating Vault..." : (vaultAddress || "Connect Wallet First")}
                    </p>
                  </div>
                  <button onClick={copyVaultAddress} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                    <Copy width={18} height={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* NETWORK SELECTOR & SCANNER */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <SystemRestart width={20} className={isScanning ? "animate-spin" : ""} /> Trash Scanner
                </h3>
                
                {/* Simple Network Selector */}
                <select 
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="bg-slate-50 border-none text-[10px] font-bold py-1 px-3 rounded-full outline-none text-slate-500 appearance-none text-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="base-mainnet">BASE</option>
                  <option value="zora-mainnet">ZORA</option>
                  <option value="arb-mainnet">ARBITRUM</option>
                  <option value="opt-mainnet">OPTIMISM</option>
                </select>
              </div>

              <button 
                onClick={() => scanTrash(address, selectedNetwork)} 
                disabled={isScanning || !isConnected}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 flex justify-center items-center gap-2"
              >
                {isScanning ? "Scanning Blockchain..." : `Scan My Wallet (${selectedNetwork.split('-')[0].toUpperCase()})`}
              </button>

              <div className="mt-8 space-y-4">
                {tokens.length > 0 ? (
                  tokens.map((token: any) => (
                    <div key={token.address} className="group flex justify-between items-center p-4 bg-slate-50 hover:bg-white hover:shadow-md rounded-2xl border border-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                        {token.logo ? (
                          <img src={token.logo} className="w-10 h-10 rounded-xl border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">
                            {token.symbol?.[0] || 'T'}
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-bold text-slate-800">{token.symbol}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{selectedNetwork.split('-')[0]}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleQuarantine(token.address, token.symbol)}
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
                      <p className="text-slate-400 text-sm italic">Pilih jaringan dan klik scan.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 text-left">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wallet width={20} /> Isi Quarantine Vault (Base)
              </h3>
              
              <div className="space-y-3">
                {vaultScanner.isLoading ? (
                  <p className="text-xs text-slate-400">Mengecek isi vault...</p>
                ) : vaultScanner.tokens.length > 0 ? (
                  vaultScanner.tokens.map((token: any) => (
                    <div key={token.address} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        {token.logo ? <img src={token.logo} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 bg-slate-200 rounded-full" />}
                        <p className="font-bold text-sm">{token.symbol}</p>
                      </div>
                      <p className="text-xs text-slate-500">In Vault</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-40 italic text-xs">
                    Vault kosong.
                  </div>
                )}
              </div>
            </div>
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