// src/app/api/webhook/swap/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const buyToken = searchParams.get('buyToken') || 'ETH'; 
  const sellToken = searchParams.get('sellToken');
  const sellAmount = searchParams.get('sellAmount');
  const taker = searchParams.get('taker'); // Gunakan 'taker' sesuai v2
  const buyTokenAddr = buyToken === 'ETH' ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : buyToken;

  if (!sellToken || !sellAmount || !taker) {
    return NextResponse.json({ error: 'Missing parameters: sellToken, sellAmount, and taker are required' }, { status: 400 });
  }

  // Endpoint 0x v2 untuk Base Chain
  const url = `https://base.api.0x.org/swap/permit2/quote?` + new URLSearchParams({
  buyToken: buyTokenAddr,
  sellToken: sellToken,
  sellAmount: sellAmount,
  taker: taker,
  chainId: "8453" // Wajib ada untuk v2
}).toString();

  try {
    const response = await fetch(url, {
      headers: { 
        '0x-api-key': process.env.ZERO_EX_API_KEY || '',
        '0x-version': 'v2' 
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("0x API Error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal fetch quote v2' }, { status: 500 });
  }
}