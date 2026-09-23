const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const seedProducts = [
    {
        name: "Áo sơ mi vintage",
        category: "Thời trang",
        description: "Áo sơ mi kiểu dáng vintage, còn rất mới",
        condition: "90%",
        type: "Bán",
        price: 150000,
        image_url: "/images/shirt-vintage.svg"
    },
    {
        name: "Váy dạ hội thuê",
        category: "Thời trang",
        description: "Váy dạ hội sang trọng, phù hợp tiệc tối",
        condition: "95%",
        type: "Cho thuê",
        price: 300000,
        image_url: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500&q=80"
    },
    {
        name: "Giày sneaker thể thao",
        category: "Thời trang",
        description: "Giày chạy bộ êm ái",
        condition: "85%",
        type: "Bán",
        price: 250000,
        image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"
    },
    {
        name: "Máy pha cà phê mini",
        category: "Đồ gia dụng",
        description: "Máy pha cà phê nhỏ gọn cho gia đình",
        condition: "98%",
        type: "Bán",
        price: 850000,
        image_url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&q=80"
    },
    {
        name: "Lều cắm trại 4 người",
        category: "Đồ gia dụng",
        description: "Lều chống nước, dễ lắp đặt",
        condition: "90%",
        type: "Cho thuê",
        price: 100000,
        image_url: "https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=500&q=80"
    },
    {
        name: "Bàn ủi hơi nước",
        category: "Đồ gia dụng",
        description: "Sử dụng tốt, ủi phẳng quần áo nhanh",
        condition: "80%",
        type: "Bán",
        price: 200000,
        image_url: "/images/steam-iron.svg"
    },
    {
        name: "Máy tính xách tay cũ",
        category: "Dụng cụ học tập",
        description: "Phù hợp tác vụ văn phòng, học tập",
        condition: "85%",
        type: "Bán",
        price: 4500000,
        image_url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80"
    },
    {
        name: "Bàn phím cơ Bluetooth",
        category: "Dụng cụ học tập",
        description: "Gõ êm, kết nối không dây ổn định",
        condition: "95%",
        type: "Bán",
        price: 650000,
        image_url: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80"
    },
    {
        name: "Máy chiếu mini",
        category: "Dụng cụ học tập",
        description: "Thuê thuyết trình, xem phim",
        condition: "90%",
        type: "Cho thuê",
        price: 150000,
        image_url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&q=80"
    },
    {
        name: "Loa kéo sự kiện",
        category: "Đồ sự kiện",
        description: "Âm thanh lớn, kèm 2 micro",
        condition: "85%",
        type: "Cho thuê",
        price: 350000,
        image_url: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=500&q=80"
    },
    {
        name: "Đèn trang trí tiệc",
        category: "Đồ sự kiện",
        description: "Dây đèn LED nhiều màu",
        condition: "100%",
        type: "Bán",
        price: 120000,
        image_url: "/images/party-lights.svg"
    },
    {
        name: "Cổng hoa cưới",
        category: "Đồ sự kiện",
        description: "Cho thuê cổng hoa cưới sang trọng",
        condition: "95%",
        type: "Cho thuê",
        price: 1200000,
        image_url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80"
    }
];

const seedDB = async () => {
    await db.ready;
    db.serialize(async () => {
        // Create a dummy user first to assign products
        db.get('SELECT id, role FROM users WHERE email = ?', ['admin@vongveo.com'], async (err, row) => {
            if (err) {
                console.error('Could not look up seed admin:', err.message);
                return db.close();
            }
            let userId;
            if (!row) {
                const salt = await bcrypt.genSalt(10);
                const encryptedPassword = await bcrypt.hash('123456', salt);
                
                await new Promise((resolve, reject) => {
                    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')", 
                        ['Admin', 'admin@vongveo.com', encryptedPassword], 
                        function(err) {
                            if (err) reject(err);
                            userId = this.lastID;
                            resolve();
                        }
                    );
                });
                console.log('Created dummy user.');
            } else {
                userId = row.id;
                db.run("UPDATE users SET role = 'admin' WHERE id = ?", [userId], (updateErr) => {
                    if (updateErr) console.error('Could not promote seed admin:', updateErr.message);
                });
            }
            console.log(`Seed admin database record: id=${userId}, role=admin`);

            // Insert products
            const stmt = db.prepare(`
                INSERT INTO products (user_id, name, category, description, condition, type, price, image_url, status) 
                SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'Công khai'
                WHERE NOT EXISTS (
                    SELECT 1 FROM products WHERE user_id = ? AND name = ?
                )
            `);

            for (const p of seedProducts) {
                stmt.run([userId, p.name, p.category, p.description, p.condition, p.type, p.price, p.image_url, userId, p.name]);
            }
            stmt.finalize();

            // Refresh the local illustrations for these existing seed products too.
            for (const product of seedProducts.filter((item) => item.image_url.startsWith('/images/'))) {
                db.run('UPDATE products SET image_url = ? WHERE user_id = ? AND name = ?',
                    [product.image_url, userId, product.name]);
            }
            console.log(`Seeded ${seedProducts.length} products successfully.`);
            
            db.close((err) => {
                if (err) console.error(err.message);
                console.log('Database connection closed.');
            });
        });
    });
};

seedDB();
