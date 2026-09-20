import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(
      "SELECT id, blade, ratchet, bit FROM combos ORDER BY created_at DESC"
    );
    return NextResponse.json(
      result.rows.map((combo) => ({ ...combo, id: Number(combo.id) }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no banco" },
      { status: 503 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.blade || !body.bit)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const result = await query(
      "INSERT INTO combos (blade, ratchet, bit) VALUES ($1, $2, $3) RETURNING *",
      [body.blade, body.ratchet, body.bit]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch(error) {
    console.error(error);
    return NextResponse.json({ error: "Erro no banco" }, { status: 503 });
  }
}
