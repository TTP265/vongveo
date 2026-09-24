import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { Shirt, Home as HomeIcon, PenTool, PartyPopper, ArrowDown, Recycle, ShoppingBag, Sparkles } from 'lucide-react';
import heroImg from '../assets/hero.png';
const categories = [
    { id: 'Thời trang', name: 'Thời trang', icon: <Shirt size={24} /> },
    { id: 'Đồ gia dụng', name: 'Đồ gia dụng', icon: <HomeIcon size={24} /> },
    { id: 'Dụng cụ học tập', name: 'Dụng cụ học tập', icon: <PenTool size={24} /> },
    { id: 'Đồ sự kiện', name: 'Đồ sự kiện', icon: <PartyPopper size={24} /> }
];

const Home = () => {
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // all, Bán, Cho thuê
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchParams] = useSearchParams();
    const searchQuery = (searchParams.get('search') || '').trim().toLocaleLowerCase('vi-VN');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get('/api/products');
                setProducts(res.data);
            } catch (error) {
                console.error("Error fetching products", error);
            }
        };
        fetchProducts();
    }, []);

    // Filter logic
    const filteredProducts = products.filter(product => {
        let matchTab = true;
        if (activeTab === 'Bán') matchTab = product.type === 'Bán';
        if (activeTab === 'Cho thuê') matchTab = product.type === 'Cho thuê';

        let matchCategory = true;
        if (activeCategory) matchCategory = product.category === activeCategory;

        const matchName = !searchQuery || product.name.toLocaleLowerCase('vi-VN').includes(searchQuery);

        return matchTab && matchCategory && matchName;
    });

    return (
        <>
            <Header />
            <main className="container">
                <section className="home-hero">
                    <div className="home-hero-copy">
                        <p className="home-hero-kicker"><Sparkles size={16} /> MUA BÁN VÀ CHO THUÊ ĐỒ ĐÃ QUA SỬ DỤNG</p>
                        <h1>Đồ hay tìm chủ mới.<br /><span>Giao dịch vui, sống xanh.</span></h1>
                        <p className="home-hero-description">Khám phá những món đồ thú vị quanh bạn, hoặc đăng bán để chúng tiếp tục được sử dụng.</p>
                        <a className="btn btn-primary home-hero-button" href="#products">
                            Khám phá sản phẩm <ArrowDown size={17} />
                        </a>
                    </div>
                    <div className="home-hero-art" aria-hidden="true">
                        <div className="hero-orbit hero-orbit-one" />
                        <div className="hero-orbit hero-orbit-two" />
                        <div className="hero-art-main"><img src={heroImg} alt="Hero" className="hero-art-image" /></div>
                        <div className="hero-art-tag hero-art-tag-top"><Sparkles size={17} /> Đồ độc đáo</div>
                        <div className="hero-art-tag hero-art-tag-bottom"><Recycle size={18} /> Dùng lại thật vui</div>
                    </div>
                </section>
                <section id="products" className="home-products-section">
                    <div className="home-products-heading">
                        <div>
                            <p className="home-section-kicker">GÓC KHÁM PHÁ</p>
                            <h2>{searchQuery ? 'Kết quả tìm kiếm' : 'Sản phẩm đang chờ bạn'}</h2>
                        </div>
                        <span>{filteredProducts.length} sản phẩm</span>
                    </div>
                <div className="home-filters">
                    <div className="type-tabs">
                        <button 
                            className={`type-tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            Tất cả
                        </button>
                        <button 
                            className={`type-tab ${activeTab === 'Bán' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Bán')}
                        >
                            Mua (BUY)
                        </button>
                        <button 
                            className={`type-tab ${activeTab === 'Cho thuê' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Cho thuê')}
                        >
                            Thuê (RENT)
                        </button>
                    </div>

                    <div className="category-tabs">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                            >
                                {cat.icon}
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="product-grid">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                    {filteredProducts.length === 0 && (
                        <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-light)'}}>
                            Không tìm thấy sản phẩm phù hợp.
                        </div>
                    )}
                </div>
                </section>
            </main>
        </>
    );
};

export default Home;
