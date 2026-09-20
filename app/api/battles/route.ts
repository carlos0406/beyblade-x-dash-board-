import { NextResponse } from "next/server";
import { query } from "@/lib/db";
const validPoints = [3, 2, 1, -1, -2, -3];
export async function GET() {
  try {
    const result = await query(
      "SELECT id, battle_date, combo_id, opponent_combo_id, points FROM battles ORDER BY battle_date DESC,id desc ,created_at asc"
    );
    return NextResponse.json(
      result.rows.map((battle) => ({
        ...battle,
        id: Number(battle.id),
        combo_id: Number(battle.combo_id),
        opponent_combo_id: Number(battle.opponent_combo_id),
      }))
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
    const rows = Array.isArray(body.battles) ? body.battles : [body];
    
    if (
      !rows.length ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.battle_date) ||
      rows.some(
        (battle) =>
          !Number.isInteger(battle.combo_id) ||
          !Number.isInteger(battle.opponent_combo_id) ||
          !validPoints.includes(battle.points)
      )
    )
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const result = await Promise.all(
      rows.map((battle) =>
        query(
          "INSERT INTO battles (battle_date, combo_id, opponent_combo_id, points) VALUES ($1, $2, $3, $4) RETURNING *",
          [
            body.battle_date,
            battle.combo_id,
            battle.opponent_combo_id,
            battle.points,
          ]
        )
      )
    );
    return NextResponse.json(
      result.map((item) => item.rows[0]),
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erro no banco" }, { status: 503 });
  }
}
