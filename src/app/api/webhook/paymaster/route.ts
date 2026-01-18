import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { method, params } = await request.json();
    const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

    const response = await fetch(`https://api.pimlico.io/v2/8453/rpc?apikey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 1, jsonrpc: "2.0", method, params,
      }),
    });

    const data = await response.json();
    
    // Sangat Penting: Kirim data.result agar diterima oleh permissionless
    return NextResponse.json(data.result);
  } catch (error) {
    return NextResponse.json({ error: "Paymaster API Error" }, { status: 500 });
  }
}