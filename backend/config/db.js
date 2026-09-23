const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (connectionError) => {
    if (connectionError) console.error('Error connecting to database:', connectionError.message);
});
const run = (sql) => new Promise((resolve, reject) => {
    db.run(sql, (error) => error ? reject(error) : resolve());
});
const all = (sql) => new Promise((resolve, reject) => {
    db.all(sql, [], (error, rows) => error ? reject(error) : resolve(rows));
});
const ensureColumn = async (table, column, definition) => {
    const columns = await all(`PRAGMA table_info(${table})`);
    if (!columns.some((item) => item.name === column)) {
        await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
};

db.ready = new Promise((resolve, reject) => {
    db.serialize(() => {
        (async () => {
            try {
                await run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);
                await ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'");
                await ensureColumn('users', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
                await ensureColumn('users', 'phone', "TEXT NOT NULL DEFAULT ''");
                await ensureColumn('users', 'address', "TEXT NOT NULL DEFAULT ''");
                await ensureColumn('users', 'profile_image', "TEXT NOT NULL DEFAULT ''");

                await run(`CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT,
                    condition TEXT NOT NULL DEFAULT '',
                    type TEXT NOT NULL,
                    price REAL NOT NULL,
                    image_url TEXT,
                    status TEXT DEFAULT 'Chờ kiểm duyệt',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`);
                await ensureColumn('products', 'condition', "TEXT NOT NULL DEFAULT ''");
                await ensureColumn('products', 'status', "TEXT DEFAULT 'Chờ kiểm duyệt'");

                await run(`CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    total_amount REAL NOT NULL,
                    status TEXT DEFAULT 'Chờ xác nhận',
                    shipping_name TEXT NOT NULL DEFAULT '',
                    shipping_phone TEXT NOT NULL DEFAULT '',
                    shipping_address TEXT NOT NULL DEFAULT '',
                    note TEXT NOT NULL DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`);
                await ensureColumn('orders', 'shipping_name', "TEXT NOT NULL DEFAULT ''");
                await ensureColumn('orders', 'shipping_phone', "TEXT NOT NULL DEFAULT ''");
                await ensureColumn('orders', 'shipping_address', "TEXT NOT NULL DEFAULT ''");
                await ensureColumn('orders', 'note', "TEXT NOT NULL DEFAULT ''");

                await run(`CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    rent_days INTEGER DEFAULT 0,
                    price REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Chờ xác nhận',
                    FOREIGN KEY (order_id) REFERENCES orders (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )`);
                await ensureColumn('order_items', 'status', "TEXT NOT NULL DEFAULT 'Chờ xác nhận'");
                await run("UPDATE order_items SET status = 'SOLD' WHERE status = 'Đã xác nhận'");
                await run("UPDATE orders SET status = 'SOLD' WHERE status = 'Đã xác nhận'");
                await run("UPDATE products SET status = 'SOLD' WHERE id IN (SELECT product_id FROM order_items WHERE status = 'SOLD')");

                await run(`CREATE TABLE IF NOT EXISTS product_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    image_url TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
                )`);
                await run(`CREATE TABLE IF NOT EXISTS chat_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    buyer_id INTEGER NOT NULL,
                    seller_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (product_id, buyer_id),
                    FOREIGN KEY (product_id) REFERENCES products (id),
                    FOREIGN KEY (buyer_id) REFERENCES users (id),
                    FOREIGN KEY (seller_id) REFERENCES users (id)
                )`);
                await run(`CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    sender_id INTEGER NOT NULL,
                    body TEXT NOT NULL,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id),
                    FOREIGN KEY (sender_id) REFERENCES users (id)
                )`);
                await run('CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (conversation_id, id)');
                await run(`CREATE TABLE IF NOT EXISTS reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                    comment TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (product_id, user_id),
                    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`);
                console.log('Connected to SQLite database and schema is ready.');
                resolve();
            } catch (error) {
                console.error('Error preparing database schema:', error.message);
                reject(error);
            }
        })();
    });
});

module.exports = db;
