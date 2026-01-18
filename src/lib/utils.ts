import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const METADATA = {
  name: "Quarantine Six",
  description: "Cleaning up your wallet from dust tokens on Base Network",
  bannerImageUrl: 'https://quarantine-six.vercel.app/banner.png',
  iconImageUrl: 'https://quarantine-six.vercel.app/icon.png',
  // homeUrl: process.env.NEXT_PUBLIC_URL ?? "https://frames-v2-demo-lilac.vercel.app",
  homeUrl: "https://quarantine-six.vercel.app",
  splashBackgroundColor: "#FFFFFF"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
