"use client";

import { Wallet } from "iconoir-react";
import { Typography } from "@worldcoin/mini-apps-ui-kit-react";
import { WalletConnect } from "~/components/wallet/wallet-actions";

export function WalletConnectPrompt() {
  return (
    <div className="flex flex-col justify-center items-center text-center min-h-[70vh] px-6">
      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
        <Wallet width={40} className="text-blue-600" />
      </div>
      
      <div className="max-w-xs space-y-2 mb-8">
        <Typography variant="heading" className="text-2xl font-black text-slate-900 dark:text-white">
          Connect Wallet
        </Typography>
        <Typography variant="body" className="text-sm text-slate-500 leading-relaxed">
          Hubungkan dompet Anda untuk mengakses fitur Vault, Quarantine, dan Swap on-chain.
        </Typography>
      </div>

      <div className="w-full max-w-[240px]">
        <WalletConnect />
      </div>
    </div>
  );
}