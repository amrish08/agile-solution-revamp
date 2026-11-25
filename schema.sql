CREATE TABLE IF NOT EXISTS orders (
  txnid TEXT PRIMARY KEY,
  amount TEXT NOT NULL,
  productinfo TEXT NOT NULL,
  firstname TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  device TEXT NOT NULL,
  issue TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mihpayid TEXT,
  payu_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
