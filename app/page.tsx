"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Database,
  Menu,
  Percent,
  Pencil,
  Plus,
  RefreshCw,
  Swords,
  Trash2,
  X,
} from "lucide-react";

type Combo = { id: number; blade: string; ratchet: string; bit: string };
type Battle = {
  id: number;
  battle_date: string;
  combo_id: number;
  opponent_combo_id: number;
  points: number;
};
type BattleDraft = {
  combo_id: string | number;
  opponent_combo_id: string | number;
  points: number;
};
type Tab =   "Batalhas" | "Combos" | "Matchups" | "Win rate";
const tabs: Tab[] = [
  "Batalhas",
  "Combos",
  "Matchups",
  "Win rate",
];
const points = [3, 2, 1, -1, -2, -3];
const comboLabel = (combo: Combo) =>
  `${combo.blade} · ${combo.ratchet} · ${combo.bit}`;
const comboDisplay = (combos: Combo[], id: number) => {
  const combo = combos.find((item) => item.id === id);
  return combo ? comboLabel(combo) : "Combo removido";
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("Batalhas");
  const [menuOpen, setMenuOpen] = useState(false);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"combo" | "battle" | null>(null);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [editingBattle, setEditingBattle] = useState<Battle | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [comboResponse, battleResponse] = await Promise.all([
        fetch("/api/combos"),
        fetch("/api/battles"),
      ]);
      if (!comboResponse.ok || !battleResponse.ok)
        throw new Error("Banco indisponível");
      setCombos(await comboResponse.json());
      setBattles(await battleResponse.json());
      setError("");
    } catch {
      setError(
        "Não foi possível conectar ao PostgreSQL. Suba o Docker e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const total = battles.reduce((sum, battle) => sum + battle.points, 0);
  const positive = battles.filter((battle) => battle.points > 0).length;
  const matchupRows = useMemo(
    () =>
      Array.from(
        new Set(
          battles.map(
            (battle) => `${battle.combo_id}:${battle.opponent_combo_id}`,
          ),
        ),
      )
        .map((key) => {
          const [mine, opponent] = key.split(":").map(Number);
          const rows = battles.filter(
            (battle) =>
              battle.combo_id === mine && battle.opponent_combo_id === opponent,
          );
          const wins = rows.filter((battle) => battle.points > 0).length;
          const losses = rows.filter((battle) => battle.points < 0).length;
          const positivePoints = rows
            .filter((battle) => battle.points > 0)
            .reduce((sum, battle) => sum + battle.points, 0);
          const negativePoints = rows
            .filter((battle) => battle.points < 0)
            .reduce((sum, battle) => sum + battle.points, 0);
          return {
            key,
            mine: comboDisplay(combos, mine),
            opponent: comboDisplay(combos, opponent),
            count: rows.length,
            wins,
            losses,
            positivePoints,
            negativePoints,
            score: positivePoints + negativePoints,
            winRate: rows.length ? (wins / rows.length) * 100 : 0,
          };
        })
        .sort((a, b) => b.winRate - a.winRate || b.score - a.score),
    [battles, combos],
  );
  const comboStats = useMemo(() => {
    const usedComboIds = new Set(battles.map((battle) => battle.combo_id));
    return combos
      .filter((combo) => usedComboIds.has(combo.id))
      .map((combo) => {
        const rows = battles.filter((battle) => battle.combo_id === combo.id);
        const wins = rows.filter((battle) => battle.points > 0).length;
        const positivePoints = rows
          .filter((battle) => battle.points > 0)
          .reduce((sum, battle) => sum + battle.points, 0);
        const negativePoints = rows
          .filter((battle) => battle.points < 0)
          .reduce((sum, battle) => sum + battle.points, 0);
        const byDate = Array.from(
          rows.reduce((map, battle) => {
            const date = battle.battle_date;
            const current = map.get(date) ?? {
              date,
              wins: 0,
              total: 0,
              positivePoints: 0,
              negativePoints: 0,
              score: 0,
            };
            current.total += 1;
            if (battle.points > 0) {
              current.wins += 1;
              current.positivePoints += battle.points;
            } else {
              current.negativePoints += battle.points;
            }
            current.score = current.positivePoints + current.negativePoints;
            map.set(date, current);
            return map;
          }, new Map<string, {
            date: string;
            wins: number;
            total: number;
            positivePoints: number;
            negativePoints: number;
            score: number;
          }>())
        ).map(([date, day]) => ({
          ...day,
          winRate: day.total ? (day.wins / day.total) * 100 : 0,
        })).sort((a, b) => b.date.localeCompare(a.date));

        return {
          combo,
          wins,
          total: rows.length,
          winRate: rows.length ? (wins / rows.length) * 100 : 0,
          positivePoints,
          negativePoints,
          score: positivePoints + negativePoints,
          byDate,
        };
      })
      .sort((a, b) => b.winRate - a.winRate || b.score - a.score);
  }, [battles, combos]);

  async function remove(path: string) {
    if (!window.confirm("Excluir este registro?")) return;
    await fetch(path, { method: "DELETE" });
    await load();
  }
  function openCombo(combo?: Combo) {
    setEditing(combo ?? null);
    setModal("combo");
  }
  function openBattle(battle?: Battle) {
    setEditingBattle(battle ?? null);
    setModal("battle");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Swords size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">Beyblade X</p>
              <p className="text-xs text-muted-foreground">
                Performance tracker
              </p>
            </div>
          </div>
          <button
            className="rounded-md p-2 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <nav
            className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-[69px] z-20 flex-col gap-1 border-b border-border bg-card p-3 md:static md:flex md:flex-row md:border-0 md:p-0`}
            aria-label="Navegação principal"
          >
            {tabs.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setTab(item);
                  setMenuOpen(false);
                }}
                className={`rounded-md px-3 py-2 text-left text-sm ${tab === item ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => openCombo()}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Plus size={15} className="mr-1 inline" />
              Novo combo
            </button>
            <button
              onClick={() => openBattle()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus size={15} className="mr-1 inline" />
              Registrar batalha
            </button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Dados do PostgreSQL
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {tab}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Somente registros persistidos no banco local.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 self-start rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw size={15} />
            Atualizar
          </button>
        </div>
        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <Database size={18} />
            {error}
          </div>
        )}
        {loading ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Consultando PostgreSQL...
          </div>
        ) : (
          <>
            {tab === "Batalhas" && (
              <BattleList
                battles={battles}
                combos={combos}
                onEdit={openBattle}
                onDelete={(id) => remove(`/api/battles/${id}`)}
              />
            )}
            {tab === "Combos" && (
              <ComboList
                combos={combos}
                onNew={() => openCombo()}
                onEdit={openCombo}
                onDelete={(id) => remove(`/api/combos/${id}`)}
              />
            )}
            {tab === "Matchups" && <Matchups rows={matchupRows} />}
            {tab === "Win rate" && <WinRate rows={comboStats} />}
          </>
        )}
      </section>
      {modal === "combo" && (
        <ComboModal
          initial={editing}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal === "battle" && (
        <BattleModal
          initial={editingBattle}
          combos={combos}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
          onComboCreated={(combo) =>
            setCombos((current) => [combo, ...current])
          }
        />
      )}
    </main>
  );
}

function Overview({
  battles,
  combos,
  total,
  positive,
}: {
  battles: Battle[];
  combos: Combo[];
  total: number;
  positive: number;
}) {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Batalhas" value={battles.length} />
        <Stat label="Saldo de pontos" value={total > 0 ? `+${total}` : total} />
        <Stat label="Combos cadastrados" value={combos.length} />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Banco conectado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {battles.length
            ? `${positive} batalhas com pontuação positiva registradas.`
            : "Nenhuma batalha registrada ainda. Use o botão acima para começar."}
        </p>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold">{value}</p>
    </div>
  );
}
function BattleList({
  battles,
  combos,
  onEdit,
  onDelete,
}: {
  battles: Battle[];
  combos: Combo[];
  onEdit: (battle: Battle) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-semibold">Histórico de batalhas</h2>
      </div>
      {battles.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Meu combo</th>
                <th className="px-5 py-3">Oponente</th>
                <th className="px-5 py-3 text-right">Pontos</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {battles.map((battle) => (
                <tr key={battle.id}>
                  <td className="px-5 py-4 font-mono text-muted-foreground">
                    #{battle.id}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(battle.battle_date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {comboDisplay(combos, battle.combo_id)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {comboDisplay(combos, battle.opponent_combo_id)}
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-mono font-semibold ${battle.points > 0 ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {battle.points > 0 ? `+${battle.points}` : battle.points}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => onEdit(battle)}
                      aria-label="Editar batalha"
                      className="mr-3 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(battle.id)}
                      aria-label="Excluir batalha"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="Nenhuma batalha cadastrada." />
      )}
    </section>
  );
}
function ComboList({
  combos,
  onNew,
  onEdit,
  onDelete,
}: {
  combos: Combo[];
  onNew: () => void;
  onEdit: (combo: Combo) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Combos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Combos disponíveis para seus registros.
          </p>
        </div>
        <button
          onClick={onNew}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          <Plus size={15} className="mr-1 inline" />
          Criar combo
        </button>
      </div>
      {combos.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{comboLabel(combo)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(combo)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(combo.id)}
                  className="text-xs text-destructive"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Nenhum combo cadastrado." />
      )}
    </section>
  );
}
function Matchups({
  rows,
}: {
  rows: {
    key: string;
    mine: string;
    opponent: string;
    count: number;
    wins: number;
    losses: number;
    positivePoints: number;
    negativePoints: number;
    score: number;
    winRate: number;
  }[];
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-semibold">Matchups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Desempenho do combo selecionado contra cada oponente.
        </p>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Meu combo</th>
                <th className="px-5 py-3">Oponente</th>
                <th className="px-5 py-3">Batalhas</th>
                <th className="px-5 py-3">Vitórias</th>
                <th className="px-5 py-3">Derrotas</th>
                <th className="px-5 py-3">Win rate</th>
                <th className="px-5 py-3">Pontos ganhos</th>
                <th className="px-5 py-3">Pontos perdidos</th>
                <th className="px-5 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-5 py-4 font-medium">{row.mine}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {row.opponent}
                  </td>
                  <td className="px-5 py-4 font-mono">{row.count}</td>
                  <td className="px-5 py-4 text-emerald-600">{row.wins}</td>
                  <td className="px-5 py-4 text-destructive">{row.losses}</td>
                  <td className="px-5 py-4">
                    <strong className="font-mono">
                      {row.winRate.toFixed(1)}%
                    </strong>
                    <span className="ml-2 text-muted-foreground">
                      {row.wins}/{row.count}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-emerald-600">
                    +{row.positivePoints}
                  </td>
                  <td className="px-5 py-4 font-mono text-destructive">
                    {row.negativePoints}
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-mono font-semibold ${row.score >= 0 ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {row.score > 0 ? `+${row.score}` : row.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="Nenhum matchup disponível." />
      )}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="p-10 text-center text-sm text-muted-foreground">{text}</div>
  );
}
function WinRate({
  rows,
}: {
  rows: {
    combo: Combo;
    wins: number;
    total: number;
    winRate: number;
    positivePoints: number;
    negativePoints: number;
    score: number;
    byDate: {
      date: string;
      wins: number;
      total: number;
      positivePoints: number;
      negativePoints: number;
      score: number;
      winRate: number;
    }[];
  }[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const allExpanded =
    rows.length > 0 && rows.every((row) => expanded.has(row.combo.id));

  const toggleRow = (comboId: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(comboId)) next.delete(comboId);
      else next.add(comboId);
      return next;
    });
  };

  const toggleAll = () => {
    setExpanded((current) => {
      const next = new Set(current);
      if (rows.length > 0 && rows.every((row) => next.has(row.combo.id))) {
        rows.forEach((row) => next.delete(row.combo.id));
      } else {
        rows.forEach((row) => next.add(row.combo.id));
      }
      return next;
    });
  };

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Percent size={18} className="text-primary" />
            <div>
              <h2 className="font-semibold">Win rate por combo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Considera somente as batalhas em que o combo aparece como seu
                combo.
              </p>
            </div>
          </div>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              {allExpanded ? "Contrair tudo" : "Expandir tudo"}
            </button>
          )}
        </div>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Combo</th>
                <th className="px-5 py-3">Win rate</th>
                <th className="px-5 py-3">Vitórias</th>
                <th className="px-5 py-3">Batalhas</th>
                <th className="px-5 py-3">Pontos ganhos</th>
                <th className="px-5 py-3">Pontos perdidos</th>
                <th className="px-5 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isExpanded = expanded.has(row.combo.id);

                return (
                  <Fragment key={row.combo.id}>
                    <tr key={row.combo.id}>
                      <td className="px-5 py-4 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleRow(row.combo.id)}
                          className="mr-2 inline-flex size-6 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:bg-muted"
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Fechar detalhes de ${comboLabel(row.combo)}`
                              : `Expandir detalhes de ${comboLabel(row.combo)}`
                          }
                        >
                          {isExpanded ? "▾" : "▸"}
                        </button>
                        {comboLabel(row.combo)}
                      </td>
                      <td className="px-5 py-4">
                        <strong className="font-mono text-base">
                          {row.winRate.toFixed(1)}%
                        </strong>
                        <span className="ml-2 text-muted-foreground">
                          {row.wins}/{row.total}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-emerald-600">{row.wins}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {row.total}
                      </td>
                      <td className="px-5 py-4 font-mono text-emerald-600">
                        +{row.positivePoints}
                      </td>
                      <td className="px-5 py-4 font-mono text-destructive">
                        {row.negativePoints}
                      </td>
                      <td
                        className={`px-5 py-4 text-right font-mono font-semibold ${row.score >= 0 ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {row.score > 0 ? `+${row.score}` : row.score}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${row.combo.id}-details`}>
                        <td colSpan={7} className="bg-muted/20 p-4">
                          <div className="rounded-lg border border-border bg-background/40">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px] text-left text-sm">
                                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2">Dia</th>
                                    <th className="px-3 py-2">Batalhas</th>
                                    <th className="px-3 py-2">Vitórias</th>
                                    <th className="px-3 py-2">Derrotas</th>
                                    <th className="px-3 py-2">Win rate</th>
                                    <th className="px-3 py-2">Pontos ganhos</th>
                                    <th className="px-3 py-2">Pontos perdidos</th>
                                    <th className="px-3 py-2 text-right">Saldo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {row.byDate.map((day) => (
                                    <tr key={day.date}>
                                      <td className="px-3 py-3 font-medium">
                                        {new Date(`${day.date}`).toLocaleDateString(
                                          "pt-BR",
                                        )}
                                      </td>
                                      <td className="px-3 py-3 font-mono">
                                        {day.total}
                                      </td>
                                      <td className="px-3 py-3 text-emerald-600">
                                        {day.wins}
                                      </td>
                                      <td className="px-3 py-3 text-destructive">
                                        {day.total - day.wins}
                                      </td>
                                      <td className="px-3 py-3">
                                        <strong className="font-mono">
                                          {day.winRate.toFixed(1)}%
                                        </strong>
                                      </td>
                                      <td className="px-3 py-3 font-mono text-emerald-600">
                                        +{day.positivePoints}
                                      </td>
                                      <td className="px-3 py-3 font-mono text-destructive">
                                        {day.negativePoints}
                                      </td>
                                      <td
                                        className={`px-3 py-3 text-right font-mono font-semibold ${day.score >= 0 ? "text-emerald-600" : "text-destructive"}`}
                                      >
                                        {day.score > 0 ? `+${day.score}` : day.score}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="Nenhum combo cadastrado." />
      )}
    </section>
  );
}

function Modal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ComboModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Combo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    blade: initial?.blade ?? "",
    ratchet: initial?.ratchet ?? "",
    bit: initial?.bit ?? "",
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await fetch(initial ? `/api/combos/${initial.id}` : "/api/combos", {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    onSaved();
  };
  return (
    <Modal title={initial ? "Editar combo" : "Criar combo"} onClose={onClose}>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["blade", "ratchet", "bit"] as const).map((field) => (
            <label key={field} className="text-sm font-medium">
              {field}
              <input
                value={form[field]}
                onChange={(event) =>
                  setForm({ ...form, [field]: event.target.value })
                }
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
          ))}
        </div>
        <button className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground">
          Salvar combo
        </button>
      </form>
    </Modal>
  );
}
function ComboPicker({
  label,
  combos,
  value,
  onChange,
}: {
  label: string;
  combos: Combo[];
  value: string | number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = combos.find((combo) => combo.id === Number(value));
  const filtered = combos.filter((combo) =>
    comboLabel(combo).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="relative">
      <label className="block text-sm font-medium">
        {label}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-1.5 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left font-normal"
        >
          <span
            className={selected ? "text-foreground" : "text-muted-foreground"}
          >
            {selected ? comboLabel(selected) : "Selecione um combo"}
          </span>
          <span aria-hidden="true">⌄</span>
        </button>
      </label>
      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-card p-2 shadow-lg">
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar combo..."
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />{" "}
          <div className="mt-1 max-h-48 overflow-y-auto">
            {filtered.length ? (
              filtered.map((combo) => (
                <button
                  type="button"
                  key={combo.id}
                  onClick={() => {
                    onChange(combo.id);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  {comboLabel(combo)}
                </button>
              ))
            ) : (
              <p className="p-2 text-sm text-muted-foreground">
                Nenhum combo encontrado.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function SingleBattleModal({
  initial,
  combos,
  onClose,
  onSaved,
}: {
  initial: Battle;
  combos: Combo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<{
    battle_date: string;
    combo_id: string | number;
    opponent_combo_id: string | number;
    points: number;
  }>({
    battle_date: initial.battle_date,
    combo_id: initial.combo_id,
    opponent_combo_id: initial.opponent_combo_id,
    points: initial.points,
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch(`/api/battles/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        combo_id: Number(form.combo_id),
        opponent_combo_id: Number(form.opponent_combo_id),
      }),
    });
    if (response.ok) onSaved();
  };
  return (
    <Modal title="Editar batalha" onClose={onClose}>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Data da batalha
          <input
            required
            type="date"
            value={form.battle_date}
            onChange={(event) =>
              setForm({ ...form, battle_date: event.target.value })
            }
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
        <ComboPicker
          label="Meu combo"
          combos={combos}
          value={form.combo_id}
          onChange={(value) => setForm({ ...form, combo_id: value })}
        />
        <ComboPicker
          label="Combo do oponente"
          combos={combos}
          value={form.opponent_combo_id}
          onChange={(value) => setForm({ ...form, opponent_combo_id: value })}
        />
        <fieldset>
          <legend className="text-sm font-medium">Saldo de pontos</legend>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {points.map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setForm({ ...form, points: value })}
                className={`rounded-md border py-2 text-sm font-semibold ${form.points === value ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
              >
                {value > 0 ? `+${value}` : value}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          disabled={combos.length < 2}
          className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Atualizar batalha
        </button>
      </form>
    </Modal>
  );
}

function BattleModal({
  initial,
  combos,
  onClose,
  onSaved,
  onComboCreated,
}: {
  initial: Battle | null;
  combos: Combo[];
  onClose: () => void;
  onSaved: () => void;
  onComboCreated: (combo: Combo) => void;
}) {
  if (initial)
    return (
      <SingleBattleModal
        initial={initial}
        combos={combos}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  const today = new Date().toISOString().slice(0, 10);
  const emptyDraft = (): BattleDraft => ({
    combo_id: combos[0]?.id ?? "",
    opponent_combo_id: combos[1]?.id ?? combos[0]?.id ?? "",
    points: 1,
  });
  const [battleDate, setBattleDate] = useState(today);
  const [drafts, setDrafts] = useState<BattleDraft[]>([emptyDraft()]);
  const [newCombo, setNewCombo] = useState({ blade: "", ratchet: "", bit: "" });
  const [comboError, setComboError] = useState("");
  const updateDraft = (index: number, draft: BattleDraft) =>
    setDrafts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? draft : item)),
    );
  const createCombo = async (event: React.FormEvent) => {
    event.preventDefault();
    setComboError("");
    const response = await fetch("/api/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCombo),
    });
    if (!response.ok) {
      setComboError("Não foi possível criar o combo.");
      return;
    }
    const combo = (await response.json()) as Combo;
    onComboCreated({ ...combo, id: Number(combo.id) });
    setNewCombo({ blade: "", ratchet: "", bit: "" });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/battles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        battle_date: battleDate,
        battles: drafts.map((draft) => ({
          combo_id: Number(draft.combo_id),
          opponent_combo_id: Number(draft.opponent_combo_id),
          points: draft.points,
        })),
      }),
    });
    if (response.ok) onSaved();
  };
  return (
    <Modal title="Registrar batalhas" onClose={onClose}>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold">Cadastrar combo</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <input
              value={newCombo.blade}
              onChange={(event) =>
                setNewCombo({ ...newCombo, blade: event.target.value })
              }
              placeholder="Blade"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              value={newCombo.ratchet}
              onChange={(event) =>
                setNewCombo({ ...newCombo, ratchet: event.target.value })
              }
              placeholder="Ratchet"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              value={newCombo.bit}
              onChange={(event) =>
                setNewCombo({ ...newCombo, bit: event.target.value })
              }
              placeholder="Bit"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              type="button"
              onClick={(event) => void createCombo(event)}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              <Plus size={15} className="mr-1 inline" />
              Adicionar
            </button>
          </div>
          {comboError && (
            <p className="mt-2 text-sm text-destructive">{comboError}</p>
          )}
        </div>
        <label className="block text-sm font-medium">
          Data das batalhas
          <input
            required
            type="date"
            value={battleDate}
            onChange={(event) => setBattleDate(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3"
          />
        </label>
        <div className="space-y-3">
          {drafts.map((draft, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <div className="grid gap-3">
                <ComboPicker
                  label="Meu combo"
                  combos={combos}
                  value={draft.combo_id}
                  onChange={(value) =>
                    updateDraft(index, { ...draft, combo_id: value })
                  }
                />
                <ComboPicker
                  label="Combo do oponente"
                  combos={combos}
                  value={draft.opponent_combo_id}
                  onChange={(value) =>
                    updateDraft(index, { ...draft, opponent_combo_id: value })
                  }
                />
                <fieldset>
                  <legend className="text-sm font-medium">Pontos</legend>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {points.map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() =>
                          updateDraft(index, { ...draft, points: value })
                        }
                        className={`rounded-md border py-2 text-sm font-semibold ${draft.points === value ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                      >
                        {value > 0 ? `+${value}` : value}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="text-right text-sm text-destructive"
                  >
                    Remover linha
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDrafts((current) => [...current, emptyDraft()])}
            className="flex-1 rounded-md border border-border py-2.5 text-sm"
          >
            Adicionar combate
          </button>
          <button
            disabled={combos.length < 2}
            className="flex-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Salvar batalhas
          </button>
        </div>
      </form>
    </Modal>
  );
}
