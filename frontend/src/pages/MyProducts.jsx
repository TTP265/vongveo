import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { getImageUrl } from '../utils/imageUrl';

const categories = ['Thời trang', 'Đồ gia dụng', 'Dụng cụ học tập', 'Đồ sự kiện'];
const emptyForm = { name: '', category: '', description: '', type: '', price: '' };

const MyProducts = () => {
    const [products, setProducts] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusWorkingId, setStatusWorkingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('/api/products/mine');
            setProducts(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể tải sản phẩm của bạn');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const startEditing = (product) => {
        setEditingId(product.id);
        setForm({
            name: product.name,
            category: product.category,
            description: product.description || '',
            type: product.type,
            price: String(product.price),
        });
        setImage(null);
        setError('');
        setSuccess('');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setForm(emptyForm);
        setImage(null);
        setError('');
    };

    const updateField = (event) => {
        setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    };

    const saveProduct = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        if (image) data.append('image', image);

        try {
            const response = await axios.patch(`/api/products/mine/${editingId}`, data);
            setSuccess(response.data.message);
            setEditingId(null);
            setForm(emptyForm);
            setImage(null);
            await loadProducts();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể cập nhật sản phẩm');
        } finally {
            setSaving(false);
        }
    };

    const changeProductStatus = async (product, status) => {
        setStatusWorkingId(product.id);
        setError('');
        setSuccess('');
        try {
            const response = await axios.patch(`/api/products/mine/${product.id}/status`, { status });
            setProducts((current) => current.map((item) => item.id === product.id
                ? { ...item, status: response.data.status }
                : item));
            setSuccess(response.data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái sản phẩm');
        } finally {
            setStatusWorkingId(null);
        }
    };

    const deleteProduct = async (product) => {
        if (!window.confirm(`Xóa sản phẩm “${product.name}” của bạn?`)) return;
        setError('');
        setSuccess('');
        try {
            const response = await axios.delete(`/api/products/mine/${product.id}`);
            setProducts((current) => current.filter((item) => item.id !== product.id));
            setSuccess(response.data.message);
            if (editingId === product.id) cancelEditing();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể xóa sản phẩm');
        }
    };

    return (
        <>
            <Header />
            <main className="container admin-page">
                <h1>Sản phẩm của tôi</h1>
                <p className="admin-subtitle">Chỉnh sửa thông tin nếu bạn đăng nhầm. Sản phẩm đã công khai sẽ cần admin duyệt lại sau khi sửa.</p>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                {loading ? (
                    <p>Đang tải sản phẩm...</p>
                ) : products.length === 0 ? (
                    <div className="admin-empty">Bạn chưa đăng sản phẩm nào.</div>
                ) : (
                    <div className="admin-product-list">
                        {products.map((product) => (
                            <article className="admin-product" key={product.id}>
                                <img src={getImageUrl(product.image_url)} alt={product.name} className="admin-product-image" />
                                <div className="admin-product-details">
                                    <h2>{product.name}</h2>
                                    <p>Trạng thái: {product.status}</p>
                                    <p>Danh mục: {product.category} · Loại: {product.type}</p>
                                    <p>Giá: {Number(product.price).toLocaleString('vi-VN')}đ</p>
                                    {product.description && <p>{product.description}</p>}
                                    {editingId === product.id ? (
                                        <form className="product-edit-form" onSubmit={saveProduct}>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor={`name-${product.id}`}>Tên sản phẩm</label>
                                                <input id={`name-${product.id}`} name="name" className="form-input" value={form.name} onChange={updateField} required />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor={`category-${product.id}`}>Danh mục</label>
                                                <select id={`category-${product.id}`} name="category" className="form-input" value={form.category} onChange={updateField} required>
                                                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor={`description-${product.id}`}>Mô tả</label>
                                                <textarea id={`description-${product.id}`} name="description" className="form-input" rows="3" value={form.description} onChange={updateField} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor={`type-${product.id}`}>Loại giao dịch</label>
                                                <select id={`type-${product.id}`} name="type" className="form-input" value={form.type} onChange={updateField} required>
                                                    <option value="Bán">Bán</option>
                                                    <option value="Cho thuê">Cho thuê</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor={`price-${product.id}`}>Giá (VNĐ{form.type === 'Cho thuê' ? '/ngày' : ''})</label>
                                                <input id={`price-${product.id}`} name="price" type="number" min="1" className="form-input" value={form.price} onChange={updateField} required />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label" htmlFor={`image-${product.id}`}>Ảnh mới (không bắt buộc)</label>
                                                <input key={editingId} id={`image-${product.id}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="form-input" onChange={(event) => setImage(event.target.files[0] || null)} />
                                            </div>
                                            <div className="admin-product-actions">
                                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                                                <button type="button" className="btn btn-outline" onClick={cancelEditing} disabled={saving}>Hủy</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="admin-product-actions">
                                            <button type="button" className="btn btn-outline" onClick={() => startEditing(product)}>Sửa thông tin</button>
                                            {product.status === 'Công khai' && (
                                                <button type="button" className="btn btn-danger" disabled={statusWorkingId === product.id} onClick={() => changeProductStatus(product, 'SOLD')}>
                                                    {statusWorkingId === product.id ? 'Đang cập nhật...' : 'Đánh dấu SOLD'}
                                                </button>
                                            )}
                                            {product.status === 'SOLD' && (
                                                <button type="button" className="btn btn-primary" disabled={statusWorkingId === product.id} onClick={() => changeProductStatus(product, 'Công khai')}>
                                                    {statusWorkingId === product.id ? 'Đang cập nhật...' : 'Đã bổ sung hàng · Công khai lại'}
                                                </button>
                                            )}
                                            <button type="button" className="btn btn-danger" onClick={() => deleteProduct(product)}>Xóa sản phẩm</button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
};

export default MyProducts;
