// Lokasi: src/app/api/webhook/swap/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buyToken = '0x4200000000000000000000000000000000000006'; // WETH di Base
  const sellToken = searchParams.get('sellToken');
  const sellAmount = searchParams.get('sellAmount');
  const takerAddress = searchParams.get('takerAddress');

  if (!sellToken || !sellAmount || !takerAddress) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Gunakan alamat wallet Anda untuk menerima fee
  const feeRecipient = "0x4fba95e4772be6d37a0c931D00570Fe2c9675524"; 
  const buyTokenPercentageFee = "0.05"; // Fee 5% sesuai permintaan sebelumnya

  // WAJIB: Gunakan base.api.0x.org untuk jaringan Base
  const url = `https://base.api.0x.org/swap/v1/quote?buyToken=${buyToken}&sellToken=${sellToken}&sellAmount=${sellAmount}&takerAddress=${takerAddress}&feeRecipient=${feeRecipient}&buyTokenPercentageFee=${buyTokenPercentageFee}`;

  try {
    const response = await fetch(url, {
      headers: { 
        '0x-api-key': process.env.ZERO_EX_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal fetch quote 0x' }, { status: 500 });
  }
}