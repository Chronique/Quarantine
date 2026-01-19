/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther, isAddress } from "viem";
import { useAccount, useSendTransaction, usePublicClient, useConnect } from "wagmi";
import { 
  Copy, Wallet, CheckCircle, WarningTriangle, 
  RefreshDouble, ArrowRight, LogIn, 
} from "iconoir-react";

import { useScanner } from '../hooks/useScanner';
import { useVault } from './providers/VaultProvider'; 
import { TopBar } from "~/components/top-bar";
import { BottomNavigation } from "~/components/bottom-navigation";
import { TabType } from "~/types";

export default function Demo() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendTransaction } = useSendTransaction();
  const publicClient = usePublicClient();
  const { vaultAddress, isLoading: vaultLoading, smartAccountClient } = useVault();
  
  const [activeTab, setActiveTab] = useState<TabType>("actions");
  const mainScanner = useScanner();
  const vaultScanner = useScanner(); 

  const [vaultEthBalance, setVaultEthBalance] = useState("0");
  const [withdrawPercentage, setWithdrawPercentage] = useState(100);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);
  const [targetToken, setTargetToken] = useState({
    symbol: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  });

  // --- LOGIC: Fetching ---
  const fetchVaultBalance = useCallback(async () => {
    if (!vaultAddress || !isAddress(vaultAddress) || !publicClient) return;
    try {
      const balance = await publicClient.getBalance({ address: vaultAddress });
      setVaultEthBalance(formatEther(balance));
    } catch (err) {
      console.error("Balance fetch failed", err);
    }
  }, [vaultAddress, publicClient]);

  useEffect(() => {
    if (vaultAddress) fetchVaultBalance();
  }, [vaultAddress, activeTab, fetchVaultBalance]);

  useEffect(() => {
    if ((activeTab === "swap" || activeTab === "wallet") && vaultAddress) {
      vaultScanner.scanTrash(vaultAddress); 
    }
  }, [activeTab, vaultAddress]);

  // --- LOGIC: Actions ---
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
    } catch (err: any) {
      alert("Transfer gagal: " + err.message);
    }
  };

  const handleSwap = async (token: any) => {
    if (!smartAccountClient || !vaultAddress) return;
    setIsSwapping(token.address);
    try {
      const res = await fetch(`/api/webhook/swap?sellToken=${token.address}&sellAmount=${token.balance}&taker=${vaultAddress}&buyToken=${targetToken.address}`);
      const quote = await res.json();
      
      if (!res.ok) throw new Error(quote.reason || "Likuiditas tidak tersedia");

      const txs = [];
      if (quote.issues?.allowance) {
        txs.push({
          to: token.address as `0x${string}`,
          data: encodeFunctionData({
            abi: erc20Abi, 
            functionName: "approve",
            args: [quote.issues.allowance.spender as `0x${string}`, BigInt(token.balance)],
          }),
        });
      }

      txs.push({
        to: quote.transaction.to as `0x${string}`,
        data: quote.transaction.data as `0x${string}`,
        value: BigInt(quote.transaction.value),
      });

      const hash = await smartAccountClient.sendTransactions({ transactions: txs });
      alert(`Swap Berhasil! Hash: ${hash.slice(0, 10)}...`);
      fetchVaultBalance();
      vaultScanner.scanTrash(vaultAddress);
    } catch (err: any) {
      alert(`Gagal Swap: ${err.message}`);
    } finally {
      setIsSwapping(null);
    }
  };

  const handleWithdraw = async () => {
    if (!smartAccountClient || !address) return;
    const balanceInWei = parseEther(vaultEthBalance);
    const amount = (balanceInWei * BigInt(withdrawPercentage)) / 100n;
    
    try {
      const hash = await smartAccountClient.sendTransaction({ to: address, value: amount });
      alert("Withdraw Berhasil! Hash: " + hash.slice(0, 10));
      fetchVaultBalance();
    } catch (err: any) {
      alert("Gagal Withdraw. Pastikan Vault memiliki saldo ETH untuk gas.");
    }
  };

  // --- RENDER HELPERS ---
  const renderTokenItem = (token: any, actionLabel: string, onAction: (t: any) => void, isBtnLoading?: boolean) => (
    <div key={token.address} className="flex justify-between items-center p-4 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        {token.logo ? (
          <img src={token.logo} alt={token.symbol} className="w-10 h-10 rounded-xl" />
        ) : (
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">{token.symbol?.[0]}</div>
        )}
        <div className="text-left">
          <p className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{token.symbol}</p>
          <p className="text-[9px] text-slate-400 font-mono truncate w-24">{token.address}</p>
        </div>
      </div>
      <button 
        onClick={() => onAction(token)} 
        disabled={isBtnLoading}
        className="bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase tracking-tight active:scale-95 transition-all disabled:opacity-50"
      >
        {isBtnLoading ? "..." : actionLabel}
      </button>
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-black min-h-screen font-sans pb-24">
      <div className="w-full max-w-lg mx-auto p-4 pt-8">
        <TopBar />

        {!isConnected ? (
          <div className="mt-12 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-100 dark:border-zinc-800">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Wallet width={40} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Vault Disconnected</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed px-4">Dompet Anda belum terdeteksi. Silakan hubungkan dompet untuk mengelola Vault.</p>
            <button 
  onClick={() => {
    // Mencari konektor yang tersedia (MetaMask, Coinbase, dll)
    // dan menghindari konektor farcaster untuk tombol manual
    const targetConnector = connectors.find(c => c.id !== 'farcaster' && c.id !== 'farcaster-frame') || connectors[0];
    connect({ connector: targetConnector });
  }}
  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
>
  <LogIn width={20} /> CONNECT WALLET
</button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* ALERT BOX */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed font-medium">
                Vault memerlukan saldo ETH sendiri. Kirim minimal <b>$3 ETH</b> ke alamat Vault agar fitur Swap dan Withdraw lancar.
              </p>
            </div>

            {/* TAB: ACTIONS (QUARANTINE) */}
            {activeTab === "actions" && (
              <>
                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl text-white relative overflow-hidden ring-4 ring-blue-600/20">
                  <p className="text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-widest">Your Personal Vault (Base)</p>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center mb-4">
                    <p className="font-mono text-xs truncate mr-2">{vaultLoading ? "Generating..." : vaultAddress}</p>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(vaultAddress!); alert("Copied!"); }}
                      className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-90"
                    >
                      <Copy width={16} />
                    </button>
                  </div>
                  <button 
                    onClick={() => mainScanner.scanTrash(address!)} 
                    disabled={mainScanner.isLoading} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {mainScanner.isLoading ? "Scanning Blockchain..." : "Scan My Main Wallet"}
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase ml-2 tracking-widest">Infected Tokens Found</p>
                  {mainScanner.tokens.map(t => renderTokenItem(t, "Quarantine", handleQuarantine))}
                </div>
              </>
            )}

            {/* TAB: SWAP */}
            {activeTab === "swap" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                      <RefreshDouble width={24} className="text-blue-600" />
                      <h3 className="text-lg font-bold">Swap Inside Vault</h3>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                      {["ETH", "USDC"].map((sym) => (
                        <button 
                          key={sym} 
                          onClick={() => setTargetToken({ symbol: sym, address: sym === "ETH" ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" })} 
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${targetToken.symbol === sym ? "bg-white dark:bg-zinc-700 text-blue-600 shadow-sm" : "text-slate-500"}`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {vaultScanner.tokens.filter((t: any) => t.liquidityUSD > 1).map((token: any) => 
                      renderTokenItem(token, `To ${targetToken.symbol}`, handleSwap, isSwapping === token.address)
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: WALLET */}
            {activeTab === "wallet" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-zinc-800">
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-400 flex items-center gap-2 mb-2 uppercase text-[10px] tracking-widest">Vault Balance</h3>
                    <div className="text-4xl font-black text-slate-900 dark:text-white flex items-baseline gap-2">
                      {Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-bold text-blue-600">ETH</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[25, 50, 75, 100].map((pct) => (
                      <button 
                        key={pct} 
                        onClick={() => setWithdrawPercentage(pct)} 
                        className={`py-3 rounded-xl text-[10px] font-black transition-all ${withdrawPercentage === pct ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {pct === 100 ? 'MAX' : `${pct}%`}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleWithdraw} 
                    disabled={Number(vaultEthBalance) === 0} 
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95 transition-all disabled:bg-slate-200 disabled:shadow-none uppercase tracking-widest"
                  >
                    Withdraw {withdrawPercentage}%
                  </button>

                  <div className="mt-10 border-t border-slate-100 dark:border-zinc-800 pt-6">
                    <p className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Tokens In Vault</p>
                    <div className="grid grid-cols-2 gap-3">
                      {vaultScanner.tokens.map((token: any) => (
                        <div key={token.address} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            {token.logo ? <img src={token.logo} className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 bg-slate-200 rounded-full" />}
                            <p className="font-bold text-xs text-slate-700 dark:text-zinc-200">{token.symbol}</p>
                          </div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Safe in Vault</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}