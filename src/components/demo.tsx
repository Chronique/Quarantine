/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { encodeFunctionData, erc20Abi, formatEther, parseEther, isAddress } from "viem";
import { useAccount, useSendTransaction, usePublicClient, useConnect, useChainId, useSwitchChain } from "wagmi";
import { 
  Copy, Wallet, WarningTriangle, 
  RefreshDouble, LogIn, 
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
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
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

  // --- LOGIC: Price Fetching (0x API) ---
  const getEthPrice = async () => {
    try {
      if (!vaultAddress) return 3200; // Fallback default
      const res = await fetch(
        `/api/webhook/swap?sellToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&sellAmount=1000000000000000000&buyToken=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&taker=${vaultAddress}`
      );
      const data = await res.json();
      if (data.buyAmount) {
        return Number(data.buyAmount) / 1_000_000;
      }
      return 3200;
    } catch (err) {
      console.error("Gagal ambil harga via 0x:", err);
      return 3200;
    }
  };

  // --- LOGIC: Fetching Balances ---
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
    if (chainId !== 8453) { switchChain({ chainId: 8453 }); return; }

    try {
      sendTransaction({
        to: token.address as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          // PERBAIKAN: Tambahkan fallback "0"
          args: [vaultAddress as `0x${string}`, BigInt(token?.balance || "0")],
        }),
      });
    } catch (err: any) { alert("Transfer gagal: " + err.message); }
  };

  const handleSwap = async (token: any) => {
    if (!smartAccountClient || !vaultAddress) return;
    if (chainId !== 8453) { switchChain({ chainId: 8453 }); return; }

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
            // PERBAIKAN: Fallback balance
            args: [quote.issues.allowance.spender as `0x${string}`, BigInt(token?.balance || "0")],
          }),
        });
      }

      // PERBAIKAN: Validasi objek transaction dan value
      if (quote?.transaction) {
        txs.push({
          to: quote.transaction.to as `0x${string}`,
          data: quote.transaction.data as `0x${string}`,
          value: BigInt(quote.transaction.value || "0"),
        });

        const hash = await smartAccountClient.sendTransactions({ transactions: txs });
        alert(`Swap Berhasil! Hash: ${hash.slice(0, 10)}...`);
        fetchVaultBalance();
        vaultScanner.scanTrash(vaultAddress);
      } else {
        throw new Error("Data transaksi tidak valid dari API");
      }
    } catch (err: any) { alert(`Gagal Swap: ${err.message}`); } finally { setIsSwapping(null); }
  };

  // Ganti bagian handleWithdraw di demo.tsx
const handleWithdraw = async () => {
  if (!smartAccountClient || !address) return;
  
  // 1. Pastikan Chain ID benar
  if (chainId !== 8453) {
    switchChain({ chainId: 8453 });
    return;
  }

  try {
    // 2. Ambil saldo. Jika error/undefined, anggap "0"
    const balanceStr = vaultEthBalance || "0";
    const balanceInWei = parseEther(balanceStr);
    
    if (balanceInWei === 0n) {
      alert("Saldo Vault Kosong");
      return;
    }

    // 3. Ambil Harga ETH (Safe Fetch)
    let ethPrice = 3200; // Default fallback
    try {
       const fetchedPrice = await getEthPrice();
       if (fetchedPrice && !isNaN(fetchedPrice)) ethPrice = fetchedPrice;
    } catch (e) { console.log("Price fetch failed, using default"); }

    // 4. Hitung Buffer Gas ($0.5)
    const bufferUsd = 0.5;
    // toFixed(18) menjamin string angka, parseEther aman.
    const gasBufferWei = parseEther((bufferUsd / ethPrice).toFixed(18));

    // 5. SAFETY CHECK: Pastikan withdrawPercentage ada nilainya
    // Gunakan nilai default 0 jika undefined/null
    const cleanPercentage = withdrawPercentage ?? 0;
    const percentageBigInt = BigInt(cleanPercentage); // Sekarang pasti aman

    let amount = (balanceInWei * percentageBigInt) / 100n;

    // 6. Logika Max Withdraw (Sisa Gas)
    if (cleanPercentage === 100) {
      if (amount > gasBufferWei) {
        amount = amount - gasBufferWei;
      } else {
        alert(`Saldo ETH (${formatEther(amount)}) tidak cukup untuk bayar gas (butuh ~$0.5)`);
        return;
      }
    }

    // 7. Eksekusi Transaksi
    const hash = await smartAccountClient.sendTransaction({ 
      to: address, 
      value: amount 
    });
    
    alert(`Withdraw Berhasil!`);
    fetchVaultBalance();
  } catch (err: any) {
    console.error("Detail Error WD:", err);
    // Tampilkan pesan eror yang lebih jelas
    alert(`Gagal: ${err.message || "Terjadi kesalahan sistem"}`); 
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
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-start gap-3">
              <WarningTriangle width={20} className="text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed font-medium">
                Vault membayar gas sendiri. Sisakan minimal <b>$0.5 ETH</b> di alamat Vault agar transaksi lancar.
              </p>
            </div>

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

            {activeTab === "wallet" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-zinc-800">
                  <div className="mb-6 text-center">
                    <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-1">Vault Balance</h3>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">
                      {Number(vaultEthBalance).toFixed(6)} <span className="text-sm font-bold text-blue-600">ETH</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[25, 50, 75, 100].map((pct) => (
                      <button 
                        key={pct} 
                        onClick={() => setWithdrawPercentage(pct)} 
                        className={`py-3 rounded-xl text-[10px] font-black transition-all ${withdrawPercentage === pct ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}
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