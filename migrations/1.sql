
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mocha_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  hostel TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  vendor_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  total_price REAL NOT NULL,
  delivery_hostel TEXT NOT NULL,
  delivery_gate TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  expected_time TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  file_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  color_type TEXT NOT NULL,
  is_double_sided BOOLEAN NOT NULL DEFAULT 0,
  pages_per_side INTEGER NOT NULL DEFAULT 1,
  copies INTEGER NOT NULL DEFAULT 1,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  current_load INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pricing_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bw_single_page REAL NOT NULL DEFAULT 2.0,
  bw_double_page REAL NOT NULL DEFAULT 1.5,
  color_single_page REAL NOT NULL DEFAULT 10.0,
  color_double_page REAL NOT NULL DEFAULT 8.0,
  delivery_fee REAL NOT NULL DEFAULT 20.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_mocha_user_id ON users(mocha_user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_files_order_id ON order_files(order_id);
