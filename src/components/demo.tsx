/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther, isAddress } from "viem";
import { useFrameContext } from "~/components/providers/frame-provider";
import { useAccount, useSendTransaction, usePublicClient, useConnect } from "wagmi";
import { 
  Copy, Wallet, CheckCircle, WarningTriangle, LogOut, 
  RefreshDouble, ArrowRight, Cart, LogIn
} from "iconoir-react";

import { useScanner } from '../hooks/useScanner';
import { useVault } from './providers/VaultProvider'; 
import { TopBar } from "~/components/top-bar";
import { BottomNavigation } from "~/components/bottom-navigation";
import { TabType } from "~/types";

export default function Demo() {
  const frameContext = useFrameContext();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect(); // Hook koneksi manual
  const { sendTransaction } = useSendTransaction();
  const publicClient = usePublicClient();
  const { vaultAddress, isLoading: vaultLoading, smartAccountClient } = useVault();
  
  const [activeTab, setActiveTab] = useState<TabType>("actions");
  const { scanTrash, tokens, isLoading: isScanning } = useScanner();
  const vaultScanner = useScanner(); 

  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);

  const [targetToken, setTargetToken] = useState({
    symbol: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  });

  const fetchVaultBalance = useCallback(async () => {
    // Validasi alamat sebelum memanggil RPC
    if (!vaultAddress || !isAddress(vaultAddress) || !publicClient) return;
    try {
      const balance = await publicClient.getBalance({ address: vaultAddress });
      setVaultEthBalance(formatEther(balance));
    } catch (err) { console.error("Fetch balance error:", err); }
  }, [vaultAddress, publicClient]);

  useEffect(() => {
    if (vaultAddress && isAddress(vaultAddress)) fetchVaultBalance();
  }, [vaultAddress, activeTab, fetchVaultBalance]);

  useEffect(() => {
    if ((activeTab === "swap" || activeTab === "wallet") && vaultAddress && isAddress(vaultAddress)) {
      vaultScanner.scanTrash(vaultAddress); 
    }
  }, [activeTab, vaultAddress]);

  const handleQuarantine = async (token: any) => {
    if (!vaultAddress || !isAddress(vaultAddress) || !address) return;
    try {
      sendTransaction({
        to: token.address as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [vaultAddress as `0x${string}`, BigInt(token.balance)],
        }),
      });
    } catch (err) { console.error("Transfer gagal:", err); }
  };

  const handleSwap = async (token: any) => {
    if (!smartAccountClient || !vaultAddress) return;
    setIsSwapping(token.address);
    try {
      const res = await fetch(`/api/webhook/swap?sellToken=${token.address}&sellAmount=${token.balance}&takerAddress=${vaultAddress}&buyToken=${targetToken.address}`);
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
      alert(`Swap ke ${targetToken.symbol} Berhasil!`);
      fetchVaultBalance();
      vaultScanner.scanTrash(vaultAddress);
    } catch (err) { alert("Swap Gagal. Cek saldo ETH di Vault."); }
    finally { setIsSwapping(null); }
  };

  const handleWithdraw = async () => {
    if (!smartAccountClient || !address) return;
    const balanceInWei = parseEther(vaultEthBalance);
    if (balanceInWei === 0n) return;
    const amount = (balanceInWei * BigInt(withdrawPercentage)) / 100n;
    try {
      await smartAccountClient.sendTransaction({ to: address, value: amount });
      alert("Withdraw Berhasil!");
      fetchVaultBalance();
    } catch (err) { alert("Gagal. Vault butuh ETH."); }
  };

  return (
    <div style={{ marginTop: (frameContext?.context as any)?.client?.safeAreaInsets?.top ?? 0, paddingBottom: '100px' }} className="bg-slate-50 min-h-screen font-sans text-left">
      <div className="w-full max-w-lg mx-auto p-4">
        <TopBar />

        {/* TAMPILAN JIKA TIDAK TERKONEKSI */}
        {!isConnected && (
          <div className="mt-10 bg-white p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-100">
             <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Wallet width={40} className="text-blue-600" />
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Vault Disconnected</h3>
             <p className="text-slate-500 text-sm mb-8 leading-relaxed text-center">Dompet Anda belum terdeteksi. Silahkan hubungkan dompet secara manual di bawah.</p>
             <button 
               onClick={() => connect({ connector: connectors[0] })}
               className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               <LogIn width={20} /> CONNECT WALLET
             </button>
          </div>
        )}

        {isConnected && (
          <>
            {activeTab === "actions" && (
              <div className="mt-6 space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                  <WarningTriangle width={20} className="text-amber-600 mt-1" />
                  <p className="text-[10px] text-amber-700 leading-relaxed text-left">Vault memerlukan saldo ETH sendiri. Kirim minimal <b>$3 ETH</b> ke alamat Vault agar fitur Swap dan Withdraw lancar.</p>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden">
                  <div className="relative z-10 text-left">
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Your Personal Vault (Base)</p>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center mb-4">
                      <p className="font-mono text-xs truncate">{vaultLoading ? "Generating..." : (vaultAddress || "Connect Wallet")}</p>
                      <button onClick={() => { navigator.clipboard.writeText(vaultAddress!); alert("Copied!"); }} className="p-2 bg-white/10 rounded-xl transition-all active:scale-95"><Copy width={16} /></button>
                    </div>
                    <button onClick={() => scanTrash()} disabled={isScanning} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all">
                      {isScanning ? "Scanning Blockchain..." : "Scan My Main Wallet"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {tokens.map((token: any) => (
                    <div key={token.address} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-3 text-left">
                        {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>}
                        <div className="text-left">
                          <p className="font-bold text-slate-800 text-sm">{token.symbol}</p>
                          <p className="text-[9px] text-slate-400 font-mono truncate w-24">{token.address}</p>
                        </div>
                      </div>
                      <button onClick={() => handleQuarantine(token)} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase tracking-tighter hover:bg-red-500 transition-colors">Quarantine</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "swap" && (
              <div className="mt-6 space-y-4 text-left">
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-slate-800"><RefreshDouble width={24} /><h3 className="text-lg font-bold">Swap Inside Vault</h3></div>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                      {["ETH", "USDC"].map((sym) => (
                        <button key={sym} onClick={() => setTargetToken({ symbol: sym, address: sym === "ETH" ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" })} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${targetToken.symbol === sym ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>{sym}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4 text-left">
                    {vaultScanner.tokens.filter((t: any) => t.liquidityUSD > 1).map((token: any) => (
                      <div key={token.address} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white">
                        <div className="flex items-center gap-3 text-left">
                          {token.logo ? <img src={token.logo} className="w-10 h-10 rounded-xl" /> : <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">{token.symbol?.[0]}</div>}
                          <div><p className="font-bold text-slate-800 text-sm">{token.symbol}</p><p className="text-[9px] text-blue-500 font-bold uppercase text-left">Liquid: ${Number(token.liquidityUSD).toLocaleString()}</p></div>
                        </div>
                        <button onClick={() => handleSwap(token)} disabled={isSwapping === token.address} className="flex items-center gap-2 bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase shadow-md active:scale-95 disabled:bg-slate-300 transition-all">{isSwapping === token.address ? "..." : `Swap to ${targetToken.symbol}`} <ArrowRight width={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "wallet" && (
              <div className="mt-6 space-y-4 text-left">
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
                  <div className="mb-6"><h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2 text-left"><Wallet width={20} /> Saldo Vault</h3><div className="text-3xl font-black text-slate-900 text-left">{Number(vaultEthBalance).toFixed(6)} ETH</div></div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[25, 50, 75, 100].map((pct) => (
                      <button key={pct} onClick={() => setWithdrawPercentage(pct)} className={`py-2 rounded-xl text-[10px] font-bold transition-all ${withdrawPercentage === pct ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{pct === 100 ? 'MAX' : `${pct}%`}</button>
                    ))}
                  </div>
                  <button onClick={handleWithdraw} disabled={Number(vaultEthBalance) === 0} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:bg-slate-200">Withdraw {withdrawPercentage}%</button>
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest text-left">Koin di Vault</p>
                    <div className="space-y-3">
                      {vaultScanner.tokens.map((token: any) => (
                        <div key={token.address} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2">{token.logo ? <img src={token.logo} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 bg-slate-200 rounded-full" />}<p className="font-bold text-sm text-slate-700">{token.symbol}</p></div>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">In Vault</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      </div>
    </div>
  );
}