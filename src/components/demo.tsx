/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther } from "viem";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
import { 
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
  
  // Ambil smartAccountClient untuk fungsi Withdraw
  const { vaultAddress, isLoading: vaultLoading, smartAccountClient } = useVault();
  
  const [activeTab, setActiveTab] = useState<TabType>("actions");
  const isSeamlessUser = !!frameContext?.context;
  const [selectedNetwork, setSelectedNetwork] = useState("base-mainnet");
  
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  // State untuk Withdrawal
  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);

  // Fungsi ambil saldo ETH di Vault (Base)
  const fetchVaultBalance = useCallback(async () => {
    if (!vaultAddress || !publicClient) return;
    try {
      const balance = await publicClient.getBalance({ address: vaultAddress });
      setVaultEthBalance(formatEther(balance));
    } catch (err) {
      console.error("Gagal ambil saldo vault:", err);
    }
  }, [vaultAddress, publicClient]);

  useEffect(() => {
    if (vaultAddress) fetchVaultBalance();
  }, [vaultAddress, activeTab, fetchVaultBalance]);

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
      alert(`Konfirmasi pemindahan ${symbol} di wallet Anda.`);
    } catch (err) {
      console.error("Transfer gagal", err);
    }
  };

  const handleWithdraw = async () => {
    if (!smartAccountClient || !address || !vaultAddress) {
      alert("Vault belum siap.");
      return;
    }

    const balanceInWei = parseEther(vaultEthBalance);
    if (balanceInWei === 0n) {
      alert("Saldo Vault Anda kosong.");
      return;
    }

    const amountToWithdraw = (balanceInWei * BigInt(withdrawPercentage)) / 100n;

    try {
      alert(`Menarik ${withdrawPercentage}% saldo ke wallet utama...`);
      const hash = await smartAccountClient.sendTransaction({
        to: address as `0x${string}`,
        value: amountToWithdraw,
      });
      alert("Penarikan berhasil diajukan!");
      fetchVaultBalance();
    } catch (err) {
      console.error("Withdrawal gagal:", err);
      alert("Gagal menarik dana. Pastikan Vault memiliki saldo ETH untuk gas (jika tidak disponsori).");
    }
  };

  return (
    <div style={{ 
      marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0,
      paddingBottom: '100px'
    }} className="bg-slate-50 min-h-screen font-sans text-left">
      
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            
            {/* ALERT GAS FEE */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 mt-1" />
              <div>
                <p className="text-xs font-bold text-amber-800">Peringatan Saldo Gas (Base Only)</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Disarankan mentransfer <b>$3 (ETH)</b> ke Vault Anda untuk operasional. Saldo ini aman di Smart Account Anda dan bisa ditarik kapan saja.
                </p>
              </div>
            </div>

            {/* VAULT CARD */}
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden text-left">
              <div className="absolute top-[-20px] right-[-20px] opacity-10">
                <Trash width={120} height={120} />
              </div>
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Your Personal Vault</p>
                <h2 className="text-2xl font-black mb-4">Quarantine Vault</h2>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center backdrop-blur-sm">
                  <div className="truncate mr-4">
                    <p className="text-[10px] text-slate-400 mb-1">Vault Address (Base Network)</p>
                    <p className="font-mono text-sm truncate">{vaultLoading ? "Generating..." : vaultAddress}</p>
                  </div>
                  <button onClick={copyVaultAddress} className="p-3 bg-white/10 rounded-xl"><Copy width={18} /></button>
                </div>
              </div>
            </div>

            {/* SCANNER */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <SystemRestart width={20} className={isScanning ? "animate-spin" : ""} /> Trash Scanner
                </h3>
                {!isSeamlessUser && (
                  <select 
                    value={selectedNetwork} 
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="bg-slate-50 border-none text-[10px] font-bold py-1 px-3 rounded-full outline-none"
                  >
                    <option value="base-mainnet">BASE</option>
                    <option value="zora-mainnet">ZORA</option>
                    <option value="arb-mainnet">ARBITRUM</option>
                  </select>
                )}
              </div>

              <button 
                onClick={() => scanTrash(address, selectedNetwork)} 
                disabled={isScanning || !isConnected}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95"
              >
                {isScanning ? "Scanning Blockchain..." : `Scan Wallet (${selectedNetwork.split('-')[0].toUpperCase()})`}
              </button>

              <div className="mt-8 space-y-4">
                {tokens.length > 0 ? tokens.map((token: any) => (
                  <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all text-left">
                    <div className="flex items-center gap-3">
                      {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center font-bold text-slate-400">{token.symbol?.[0]}</div>}
                      <div>
                        <p className="font-bold text-slate-800">{token.symbol}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{selectedNetwork.split('-')[0]}</p>
                      </div>
                    </div>
                    <button onClick={() => handleQuarantine(token.address, token.symbol, token.balance)} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase tracking-tighter">Quarantine</button>
                  </div>
                )) : !isScanning && <div className="text-center py-12"><Cart width={48} className="mx-auto text-slate-200 mb-2" /><p className="text-slate-400 text-sm italic">Klik scan untuk mencari koin debu.</p></div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="mt-6 space-y-4 text-left">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Wallet width={20} /> Saldo Vault (Base)</h3>
                <div className="text-3xl font-black text-slate-900">{Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-medium text-slate-400">ETH</span></div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct} onClick={() => setWithdrawPercentage(pct)} className={`py-2 rounded-xl text-[10px] font-bold transition-all ${withdrawPercentage === pct ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
              
              <button onClick={handleWithdraw} disabled={Number(vaultEthBalance) === 0} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95">
                <LogOut width={18} /> Withdraw {withdrawPercentage}%
              </button>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-sm font-bold text-slate-800 mb-4">Isi Quarantine Vault</p>
                <div className="space-y-3">
                  {vaultScanner.tokens.length > 0 ? vaultScanner.tokens.map((token: any) => (
                    <div key={token.address} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        {token.logo ? <img src={token.logo} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 bg-slate-200 rounded-full" />}
                        <p className="font-bold text-sm text-slate-700">{token.symbol}</p>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">In Vault</p>
                    </div>
                  )) : <div className="text-center py-6 opacity-40 italic text-[10px]">Vault kosong.</div>}
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