// src/app/api/swap/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellToken = searchParams.get("sellToken");
  const sellAmount = searchParams.get("sellAmount");
  const takerAddress = searchParams.get("takerAddress");

  const ZERO_EX_API_KEY = process.env.ZERO_EX_API_KEY; // Pastikan ini ada di .env

  try {
    const res = await fetch(
      `https://base.api.0x.org/swap/v1/quote?buyToken=ETH&sellToken=${sellToken}&sellAmount=${sellAmount}&takerAddress=${takerAddress}`,
      {
        headers: { "0x-api-key": ZERO_EX_API_KEY || "" },
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil quote 0x" }, { status: 500 });
  }
}