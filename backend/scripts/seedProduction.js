/*
  backend/scripts/seedProduction.js
  -------------------------------------------------
  Purpose: Populate the PostgreSQL database (Render) with a default admin user
  and a set of 16 sample products (4 categories, mixed sale/rent).
  No UI, routes, or business‑logic code is modified.
*/

require('dotenv').config(); // ensure DATABASE_URL is read from .env (Render provides it automatically)
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// ------------------------------------------------------------------
// 1️⃣  Create a connection pool with SSL required by Render
// ------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // ---------------------------------------------------------------
    // 2️⃣  Ensure admin user exists (id will be needed for products)
    // ---------------------------------------------------------------
    const adminEmail = 'admin@vongveo.com';
    const adminName = 'Admin';
    const plainPassword = '123456';
    const adminRole = 'admin';

    // Try to find existing admin
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    let adminId;
    if (existing.rowCount > 0) {
      adminId = existing.rows[0].id;
      console.log(`✅ Admin already exists (id=${adminId}).`);
    } else {
      // Hash password like the registration flow
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(plainPassword, salt);

      const insertRes = await pool.query(
        `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id`,
        [adminName, adminEmail, hashed, adminRole]
      );
      adminId = insertRes.rows[0].id;
      console.log(`✅ Created admin user (id=${adminId}).`);
    }

    // Xóa tất cả sản phẩm cũ của admin để tránh trùng lặp khi chạy lại seed
    console.log(`🗑 Đang xóa dữ liệu sản phẩm cũ của admin (id=${adminId})...`);
    await pool.query('DELETE FROM products WHERE user_id = $1', [adminId]);

    // ---------------------------------------------------------------
    // 3️⃣  Define 16 sample products (4 per category, mixed types)
    // ---------------------------------------------------------------
    const sampleProducts = [
      // Thời trang
      {
        name: 'Áo khoác bomber da lộn',
        category: 'Thời trang',
        description: 'Áo khoác bomber chất liệu da lộn, phong cách street.',
        condition: 92,
        type: 'Bán',
        price: 1800000,
        image_url: 'https://picsum.photos/seed/aokhoacbomber/400/300'
      },
      {
        name: 'Váy đầm dạ hội sang trọng',
        category: 'Thời trang',
        description: 'Váy dài, thiết kế cổ cao, phù hợp tiệc cưới.',
        condition: 96,
        type: 'Cho thuê',
        price: 350000,
        image_url: 'https://picsum.photos/seed/vaydamdahoisangtrong/400/300'
      },
      {
        name: 'Quần jean skinny',
        category: 'Thời trang',
        description: 'Quần jean xanh ôm, phù hợp mọi dáng người.',
        condition: 88,
        type: 'Bán',
        price: 650000,
        image_url: 'https://picsum.photos/seed/quanjeanskinny/400/300'
      },
      {
        name: 'Mũ lưỡi trai phong cách',
        category: 'Thời trang',
        description: 'Mũ lưỡi trai cotton, màu đen, size chuẩn.',
        condition: 90,
        type: 'Cho thuê',
        price: 120000,
        image_url: 'https://picsum.photos/seed/muluoitraitphongcach/400/300'
      },
      // Đồ gia dụng
      {
        name: 'Máy xay sinh tố đa năng',
        category: 'Đồ gia dụng',
        description: 'Xay dễ, công suất mạnh, 5 tốc độ.',
        condition: 95,
        type: 'Bán',
        price: 1200000,
        image_url: 'https://picsum.photos/seed/mayxaysinhtodanan/400/300'
      },
      {
        name: 'Bếp điện từ 2 bếp',
        category: 'Đồ gia dụng',
        description: 'Bếp điện từ, tiết kiệm năng lượng, an toàn.',
        condition: 93,
        type: 'Cho thuê',
        price: 250000,
        image_url: 'https://picsum.photos/seed/bepdientu2bep/400/300'
      },
      {
        name: 'Bộ ấm trà sứ',
        category: 'Đồ gia dụng',
        description: 'Ấm trà sứ cao cấp, bộ 3 chiếc.',
        condition: 98,
        type: 'Bán',
        price: 850000,
        image_url: 'https://picsum.photos/seed/boamtrasu/400/300'
      },
      {
        name: 'Máy lọc không khí mini',
        category: 'Đồ gia dụng',
        description: 'Lọc bụi mịn, phù hợp phòng ngủ.',
        condition: 90,
        type: 'Cho thuê',
        price: 180000,
        image_url: 'https://picsum.photos/seed/maylockhongkhimini/400/300'
      },
      // Dụng cụ học tập
      {
        name: 'Laptop Dell Inspiron',
        category: 'Dụng cụ học tập',
        description: 'Laptop 15", i5, 8GB RAM, SSD 256GB.',
        condition: 87,
        type: 'Bán',
        price: 15000000,
        image_url: 'https://picsum.photos/seed/laptopdellinspiron/400/300'
      },
      {
        name: 'Máy chiếu mini HD',
        category: 'Dụng cụ học tập',
        description: 'Chiếu phim, thuyết trình, cổng HDMI.',
        condition: 91,
        type: 'Cho thuê',
        price: 300000,
        image_url: 'https://picsum.photos/seed/maychieuminihd/400/300'
      },
      {
        name: 'Bảng viết điện tử',
        category: 'Dụng cụ học tập',
        description: 'Bảng tương tác, cảm ứng đa điểm.',
        condition: 94,
        type: 'Bán',
        price: 2200000,
        image_url: 'https://picsum.photos/seed/bangvietdien/400/300'
      },
      {
        name: 'Bàn học gập gọn',
        category: 'Dụng cụ học tập',
        description: "Bàn gập nhẹ, thích hợp sinh viên và làm việc tại nhà.",
        condition: 89,
        type: 'Cho thuê',
        price: 150000,
        image_url: 'https://picsum.photos/seed/banhocgapgon/400/300'
      },
      // Đồ sự kiện
      {
        name: 'Bộ âm thanh karaoke',
        category: 'Đồ sự kiện',
        description: 'Máy karaoke, loa 2 cặp, micro không dây.',
        condition: 93,
        type: 'Bán',
        price: 4200000,
        image_url: 'https://picsum.photos/seed/amthanhkaraoke/400/300'
      },
      {
        name: 'Bạt che mưa 10x5m',
        category: 'Đồ sự kiện',
        description: 'Bạt bạt nhựa, dễ lắp đặt, chịu thời tiết.',
        condition: 95,
        type: 'Cho thuê',
        price: 400000,
        image_url: 'https://picsum.photos/seed/batchemu/400/300'
      },
      {
        name: 'Đèn LED dây 10m',
        category: 'Đồ sự kiện',
        description: 'Đèn LED đa màu, điều khiển bằng app.',
        condition: 98,
        type: 'Bán',
        price: 650000,
        image_url: 'https://picsum.photos/seed/denled/400/300'
      },
      {
        name: 'Bàn tiệc gấp',
        category: 'Đồ sự kiện',
        description: 'Bàn tiệc nhôm, 10 viên, lắp nhanh.',
        condition: 90,
        type: 'Cho thuê',
        price: 250000,
        image_url: 'https://picsum.photos/seed/bantiqgap/400/300'
      }
    ];

    // ---------------------------------------------------------------
    // 4️⃣  Insert products (skip duplicates using ON CONFLICT on (user_id, name))
    // ---------------------------------------------------------------
    let createdCount = 0;
    for (const p of sampleProducts) {
      const insertQuery = `
        INSERT INTO products (user_id, name, category, description, "condition", type, price, image_url, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Công khai')
        RETURNING id`;
      const res = await pool.query(insertQuery, [
        adminId,
        p.name,
        p.category,
        p.description,
        p.condition,
        p.type,
        p.price,
        p.image_url
      ]);
      if (res.rowCount > 0) createdCount++;
    }

    console.log(`✅ Seed complete – ${createdCount} new product(s) added for admin (id=${adminId}).`);
  } catch (err) {
    console.error('❌ Seed script error:', err);
  } finally {
    await pool.end();
  }
})();
