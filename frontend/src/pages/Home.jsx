import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { Shirt, Home as HomeIcon, PenTool, PartyPopper, ArrowDown, Recycle, Sparkles, Search, ClipboardCheck, PackageCheck, Wallet, BadgeCheck, ShieldCheck, Mail, Phone } from 'lucide-react';
import heroImg from '../assets/hero.png';
import { getImageUrl } from '../utils/imageUrl';
const categories = [
    { id: 'Thời trang', name: 'Thời trang', icon: <Shirt size={24} /> },
    { id: 'Đồ gia dụng', name: 'Đồ gia dụng', icon: <HomeIcon size={24} /> },
    { id: 'Dụng cụ học tập', name: 'Dụng cụ học tập', icon: <PenTool size={24} /> },
    { id: 'Đồ sự kiện', name: 'Đồ sự kiện', icon: <PartyPopper size={24} /> }
];
const howItWorks = [
    { title: 'Đăng hoặc tìm đồ', icon: <Search size={22} /> },
    { title: 'Chốt đơn qua nền tảng', icon: <ClipboardCheck size={22} /> },
    { title: 'Nhận hoặc trả đồ', icon: <PackageCheck size={22} /> }
];
const reasons = [
    { title: 'Tiết kiệm', description: 'Mua đồ cũ giá rẻ, thuê theo ngày', icon: <Wallet size={22} /> },
    { title: 'Được kiểm duyệt', description: 'Mô tả và tình trạng sản phẩm được duyệt trước khi đăng', icon: <BadgeCheck size={22} /> },
    { title: 'Giao dịch an toàn', description: 'Nền tảng đứng giữa làm trung gian', icon: <ShieldCheck size={22} /> }
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
                <section className="home-feature-section" aria-labelledby="how-it-works-title">
                    <div className="home-feature-heading">
                        <p className="home-section-kicker">ĐƠN GIẢN VÀ TIỆN LỢI</p>
                        <h2 id="how-it-works-title">Cách hoạt động</h2>
                    </div>
                    <div className="home-steps-grid">
                        {howItWorks.map((step, index) => (
                            <article className="home-step-card" key={step.title}>
                                <span className="home-feature-icon">{step.icon}</span>
                                <span className="home-step-number">0{index + 1}</span>
                                <h3>{step.title}</h3>
                            </article>
                        ))}
                    </div>
                </section>
                <section className="home-feature-section" aria-labelledby="why-r2r-title">
                    <div className="home-feature-heading">
                        <p className="home-section-kicker">CÙNG R2R SỬ DỤNG ĐỒ BỀN VỮNG HƠN</p>
                        <h2 id="why-r2r-title">Vì sao chọn R2R</h2>
                    </div>
                    <div className="home-reasons-grid">
                        {reasons.map((reason) => (
                            <article className="home-reason-card" key={reason.title}>
                                <span className="home-feature-icon">{reason.icon}</span>
                                <h3>{reason.title}</h3>
                                <p>{reason.description}</p>
                            </article>
                        ))}
                    </div>
                </section>
                <section className="home-categories-section" aria-labelledby="home-categories-title">
                    <div className="home-feature-heading">
                        <p className="home-section-kicker">TÌM THEO NHU CẦU</p>
                        <h2 id="home-categories-title">Danh mục nổi bật</h2>
                    </div>
                    <div className="home-category-grid">
                        {categories.map((cat) => {
                            const categoryProducts = products.filter((product) => product.category === cat.id);
                            const firstProduct = categoryProducts[0];
                            const imageUrl = firstProduct?.image_url?.trim()
                                ? getImageUrl(firstProduct.image_url)
                                : '';

                            return (
                                <button
                                    type="button"
                                    key={cat.id}
                                    className={`home-category-card ${activeCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                    aria-pressed={activeCategory === cat.id}
                                >
                                    <span className="home-category-visual">
                                        {imageUrl ? <img src={imageUrl} alt="" /> : <span className="home-category-icon">{cat.icon}</span>}
                                    </span>
                                    <span className="home-category-info">
                                        <strong>{cat.name}</strong>
                                        <span>{categoryProducts.length} sản phẩm</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
                <section className="home-stats" aria-label="Thống kê sản phẩm">
                    <div className="home-stat-item">
                        <strong>{filteredProducts.length}</strong>
                        <span>Sản phẩm đang hiển thị</span>
                    </div>
                    <div className="home-stat-item">
                        <strong>{categories.length}</strong>
                        <span>Danh mục</span>
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
            <footer className="home-footer">
                <div className="home-footer-inner">
                    <div className="home-footer-brand">
                        <span className="home-footer-logo"><Recycle size={22} /> R2R</span>
                        <p>Nền tảng mua bán và cho thuê đồ đã qua sử dụng.</p>
                        <p className="home-footer-team">Nhóm: <span className="home-footer-blank" aria-label="Tên nhóm để trống" /></p>
                    </div>
                    <div className="home-footer-contact">
                        <h2>Liên hệ</h2>
                        <p><Mail size={16} /> Email: <span className="home-footer-blank" aria-label="Email để trống" /></p>
                        <p><Phone size={16} /> SĐT: <span className="home-footer-blank" aria-label="Số điện thoại để trống" /></p>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default Home;
