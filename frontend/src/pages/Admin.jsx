import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getImageUrl } from '../utils/imageUrl';
import { Link } from 'react-router-dom';

const Admin = () => {
    const [products, setProducts] = useState([]);
    const [view, setView] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workingId, setWorkingId] = useState(null);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = view === 'pending' ? '/api/products/admin/pending' : '/api/products/admin/all';
            const response = await axios.get(endpoint);
            setProducts(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    }, [view]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const updateProductStatus = async (productId, action) => {
        setWorkingId(productId);
        setError('');
        try {
            const response = await axios.patch(`/api/products/admin/${productId}/${action}`);
            if (view === 'pending') {
                setProducts((current) => current.filter((product) => product.id !== productId));
            } else {
                setProducts((current) => current.map((product) => product.id === productId
                    ? { ...product, status: response.data.status }
                    : product));
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái sản phẩm');
        } finally {
            setWorkingId(null);
        }
    };

    return (
        <>
            <Header />
            <main className="container admin-page">
                <h1>Quản lý sản phẩm</h1>
                <p className="admin-subtitle">Duyệt bài đăng mới hoặc quản lý mọi sản phẩm trong hệ thống.</p>
                <div className="admin-product-actions admin-users-link">
                    <Link to="/admin/users" className="btn btn-outline">Quản lý người dùng</Link>
                </div>
                <div className="type-tabs admin-view-tabs">
                    <button type="button" className={`type-tab ${view === 'pending' ? 'active' : ''}`} onClick={() => setView('pending')}>
                        Chờ duyệt
                    </button>
                    <button type="button" className={`type-tab ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>
                        Tất cả sản phẩm
                    </button>
                </div>
                {error && <div className="error-message">{error}</div>}
                {loading ? (
                    <p>Đang tải danh sách...</p>
                ) : products.length === 0 ? (
                    <div className="admin-empty">{view === 'pending' ? 'Hiện không có sản phẩm chờ duyệt.' : 'Chưa có sản phẩm nào.'}</div>
                ) : (
                    <div className="admin-product-list">
                        {products.map((product) => (
                            <article className="admin-product" key={product.id}>
                                <img src={getImageUrl(product.image_url)} alt={product.name} className="admin-product-image" />
                                <div className="admin-product-details">
                                    <h2>{product.name}</h2>
                                    <p>Trạng thái: {product.status}</p>
                                    <p>Người đăng: {product.seller_name} ({product.seller_email})</p>
                                    <p>Danh mục: {product.category} · Loại: {product.type}</p>
                                    <p>Giá: {Number(product.price).toLocaleString('vi-VN')}đ</p>
                                    {product.description && <p>{product.description}</p>}
                                    <div className="admin-product-actions">
                                        <Link to={`/admin/products/${product.id}`} className="btn btn-outline">Xem chi tiết để kiểm tra</Link>
                                        {product.status === 'Chờ kiểm duyệt' && (
                                            <>
                                                <button type="button" className="btn btn-primary" disabled={workingId === product.id} onClick={() => updateProductStatus(product.id, 'approve')}>
                                                    Duyệt
                                                </button>
                                                <button type="button" className="btn btn-danger" disabled={workingId === product.id} onClick={() => updateProductStatus(product.id, 'reject')}>
                                                    Không duyệt
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
};

export default Admin;
