import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "PIMLICO_API_KEY is missing" }, { status: 500 });
    }

    const res = await fetch(`https://api.pimlico.io/v2/8453/rpc?apikey=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    
    // Kembalikan hasil dari Pimlico (baik sukses maupun error RPC)
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Paymaster Webhook Crash:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}