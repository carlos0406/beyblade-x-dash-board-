CREATE TABLE IF NOT EXISTS combos (
  id BIGSERIAL PRIMARY KEY,
  blade TEXT NOT NULL,
  ratchet TEXT NOT NULL,
  bit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE combos DROP COLUMN IF EXISTS owner;
ALTER TABLE combos DROP COLUMN IF EXISTS name;


CREATE TABLE IF NOT EXISTS battles (
  id BIGSERIAL PRIMARY KEY,
  battle_date DATE NOT NULL DEFAULT CURRENT_DATE,
  combo_id BIGINT NOT NULL REFERENCES combos(id),
  opponent_combo_id BIGINT NOT NULL REFERENCES combos(id),
  points INTEGER NOT NULL CHECK (points IN (3, 2, 1, -1, -2, -3)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS battles_date_idx ON battles (battle_date DESC);
CREATE INDEX IF NOT EXISTS battles_combo_idx ON battles (combo_id, opponent_combo_id);

