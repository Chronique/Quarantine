import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buyToken = '0x4200000000000000000000000000000000000006'; // WETH di Base
  const sellToken = searchParams.get('sellToken');
  const sellAmount = searchParams.get('sellAmount');
  const takerAddress = searchParams.get('takerAddress');

  // GANTI DENGAN WALLET KAMU UNTUK TERIMA FEE
  const feeRecipient = "WALLETT_KAMU_DISINI"; 
  const buyTokenPercentageFee = "0.10"; // 10% Fee

  const url = `https://api.0x.org/swap/v1/quote?buyToken=${buyToken}&sellToken=${sellToken}&sellAmount=${sellAmount}&takerAddress=${takerAddress}&feeRecipient=${feeRecipient}&buyTokenPercentageFee=${buyTokenPercentageFee}`;

  try {
    const response = await fetch(url, {
      headers: { '0x-api-key': process.env.ZERO_EX_API_KEY || '' }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal fetch quote' }, { status: 500 });
  }
}