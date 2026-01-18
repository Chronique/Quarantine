"use client";

import dynamic from "next/dynamic";
import FrameProvider from "~/components/providers/frame-provider";
import { VaultProvider } from "~/components/providers/VaultProvider";

const WagmiProvider = dynamic(
  () => import("~/components/providers/wagmi-provider"),
  { ssr: false }
);

const ErudaProvider = dynamic(
  () => import("~/components/providers/eruda-provider"),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FrameProvider>
      <WagmiProvider>
        <ErudaProvider />
        <VaultProvider>
          {children}
        </VaultProvider>
      </WagmiProvider>
    </FrameProvider>
  );
}