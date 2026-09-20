import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
const validPoints = [3, 2, 1, -1, -2, -3]

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await context.params
		const body = await request.json()
		if (!Number.isInteger(body.combo_id) || !Number.isInteger(body.opponent_combo_id) || !validPoints.includes(body.points) || !/^\d{4}-\d{2}-\d{2}$/.test(body.battle_date)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
		const result = await query('UPDATE battles SET battle_date=$1, combo_id=$2, opponent_combo_id=$3, points=$4 WHERE id=$5 RETURNING *', [body.battle_date, body.combo_id, body.opponent_combo_id, body.points, id])
		if (!result.rowCount) return NextResponse.json({ error: 'Batalha não encontrada' }, { status: 404 })
		return NextResponse.json(result.rows[0])
	} catch { return NextResponse.json({ error: 'Erro no banco' }, { status: 503 }) }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; await query('DELETE FROM battles WHERE id=$1', [id]); return new NextResponse(null, { status: 204 }) } catch { return NextResponse.json({ error: 'Erro no banco' }, { status: 503 }) } }
