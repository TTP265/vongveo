import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, LogOut, Menu, X, UserRound, Package, ClipboardList, Store, PlusCircle, ShieldCheck, Home, Sun, Moon, MessageCircle, Leaf } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

const Header = () => {
    const { user, logout } = useContext(AuthContext);
    const { itemCount } = useContext(CartContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [menuOpen, setMenuOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('vongveo-theme') || 'light');
    const menuRef = useRef(null);

    useEffect(() => {
        setSearchQuery(searchParams.get('search') || '');
    }, [searchParams]);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('vongveo-theme', theme);
    }, [theme]);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('pointerdown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSearch = (event) => {
        event.preventDefault();
        const query = searchQuery.trim();
        navigate(query ? `/?search=${encodeURIComponent(query)}` : '/');
    };

    return (
        <header className="header">
            <div className="container header-content">
                <Link to="/" className="logo header-logo"><Leaf className="header-logo-icon" size={23} strokeWidth={2.6} />vongveo</Link>
                {(location.pathname !== '/' || location.search) && (
                    <Link to="/" className="header-home-shortcut" onClick={() => setMenuOpen(false)}>
                        <Home size={18} />
                        <span>Trang chủ</span>
                    </Link>
                )}
                <form className="search-bar" role="search" onSubmit={handleSearch}>
                    <Search className="search-icon" size={20} />
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Tìm kiếm sản phẩm..." 
                        aria-label="Tìm kiếm sản phẩm"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </form>

                <Link to="/cart" className="header-cart-link" aria-label={`Giỏ hàng${itemCount > 0 ? `, ${itemCount} sản phẩm` : ''}`}>
                    <ShoppingCart size={21} />
                    {itemCount > 0 && <span className="menu-cart-count">{itemCount}</span>}
                </Link>
                {user && <Link to="/account" className="account-link header-account-link" aria-label="Quản lý tài khoản" title="Quản lý tài khoản">
                    {user.profile_image
                        ? <img src={user.profile_image} alt="" />
                        : <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
                    <strong>{user.name}</strong>
                </Link>}
                <div className="header-menu-wrapper" ref={menuRef}>
                    <button type="button" className="menu-toggle" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu chức năng'} aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen((open) => !open)}>
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    {menuOpen && <nav className="site-menu" id="site-menu" aria-label="Chức năng">
                        <div className="site-menu-user">
                            {user ? <>
                                {user.profile_image ? <img src={user.profile_image} alt="" /> : <span className="site-menu-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
                                <div><strong>{user.name}</strong><small>{user.email}</small></div>
                            </> : <strong>Menu</strong>}
                        </div>
                        <button type="button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            Chuyển sang giao diện {theme === 'dark' ? 'sáng' : 'tối'}
                        </button>
                        {user ? <>
                            <Link to="/messages" onClick={() => setMenuOpen(false)}><MessageCircle size={18} />Tin nhắn</Link>
                            <Link to="/my-products" onClick={() => setMenuOpen(false)}><Package size={18} />Sản phẩm của tôi</Link>
                            <Link to="/my-orders" onClick={() => setMenuOpen(false)}><ClipboardList size={18} />Đơn mua/thuê của tôi</Link>
                            <Link to="/seller-orders" onClick={() => setMenuOpen(false)}><Store size={18} />Đơn bán ra</Link>
                            <Link to="/sell" onClick={() => setMenuOpen(false)}><PlusCircle size={18} />Đăng sản phẩm</Link>
                            {user.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)}><ShieldCheck size={18} />Quản lý admin</Link>}
                            <button type="button" onClick={() => { setMenuOpen(false); handleLogout(); }}><LogOut size={18} />Đăng xuất</button>
                        </> : <>
                            <Link to="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
                            <Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
                        </>}
                    </nav>}
                </div>
            </div>
        </header>
    );
};

export default Header;
