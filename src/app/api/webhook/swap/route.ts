// src/app/api/webhook/swap/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Ambil parameter dari frontend
  const buyToken = searchParams.get('buyToken') || 'ETH'; 
  const sellToken = searchParams.get('sellToken');
  const sellAmount = searchParams.get('sellAmount');
  
  // PERBAIKAN: Ubah nama variabel dari takerAddress menjadi taker
  const taker = searchParams.get('taker'); 

  // Validasi parameter
  if (!sellToken || !sellAmount || !taker) {
    return NextResponse.json({ error: 'Missing parameters: sellToken, sellAmount, and taker are required' }, { status: 400 });
  }

  const feeRecipient = "0x4fba95e4772be6d37a0c931D00570Fe2c9675524"; 
  const buyTokenPercentageFee = "0.05"; // Fee 5%

  // URL 0x v2 menggunakan parameter 'taker' (bukan takerAddress)
  const url = `https://base.api.0x.org/swap/permit2/quote?buyToken=${buyToken}&sellToken=${sellToken}&sellAmount=${sellAmount}&taker=${taker}&feeRecipient=${feeRecipient}&buyTokenPercentageFee=${buyTokenPercentageFee}&chainId=8453`;

  try {
    const response = await fetch(url, {
      headers: { 
        '0x-api-key': process.env.ZERO_EX_API_KEY || '',
        '0x-version': 'v2' 
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("0x API Error Details:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: 'Gagal fetch quote dari 0x' }, { status: 500 });
  }
}