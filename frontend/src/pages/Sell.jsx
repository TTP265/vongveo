import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';

const categories = ['Thời trang', 'Đồ gia dụng', 'Dụng cụ học tập', 'Đồ sự kiện'];

const Sell = () => {
    const { user, loading } = useContext(AuthContext);
    const [form, setForm] = useState({
        name: '', category: '', description: '', type: '', price: ''
    });
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const previews = images.map((image) => URL.createObjectURL(image));
        setImagePreviews(previews);
        return () => previews.forEach((url) => URL.revokeObjectURL(url));
    }, [images]);

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;

    const updateField = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (images.length === 0) return setError('Vui lòng chọn ít nhất một ảnh sản phẩm');
        if (images.length > 10) return setError('Mỗi bài đăng được tải tối đa 10 ảnh');

        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        images.forEach((image) => data.append('images', image));

        try {
            const response = await axios.post('/api/products', data);
            setSuccess(response.data.message || 'Sản phẩm đang chờ kiểm duyệt');
            setForm({ name: '', category: '', description: '', type: '', price: '' });
            setImages([]);
            event.target.reset();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể đăng sản phẩm, vui lòng thử lại');
        }
    };

    return (
        <>
            <Header />
            <main className="container sell-page">
                <section className="sell-card">
                    <h1 className="auth-title">Đăng sản phẩm</h1>
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="name">Tên sản phẩm</label>
                            <input id="name" name="name" className="form-input" value={form.name} onChange={updateField} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="category">Danh mục</label>
                            <select id="category" name="category" className="form-input" value={form.category} onChange={updateField} required>
                                <option value="">Chọn danh mục</option>
                                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="description">Mô tả</label>
                            <textarea id="description" name="description" className="form-input" rows="4" value={form.description} onChange={updateField} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="type">Loại giao dịch</label>
                            <select id="type" name="type" className="form-input" value={form.type} onChange={updateField} required>
                                <option value="">Chọn loại giao dịch</option>
                                <option value="Bán">Bán (BUY)</option>
                                <option value="Cho thuê">Cho thuê (RENT)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="price">Giá (VNĐ{form.type === 'Cho thuê' ? '/ngày' : ''})</label>
                            <input id="price" name="price" type="number" min="1" className="form-input" value={form.price} onChange={updateField} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="images">Ảnh sản phẩm (tối đa 10 ảnh, 20 MB mỗi ảnh)</label>
                            <input id="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="form-input" multiple onChange={(event) => {
                                const selected = Array.from(event.target.files || []);
                                setImages(selected);
                                if (selected.length > 10) setError('Bạn chỉ có thể tải tối đa 10 ảnh cho mỗi sản phẩm.');
                                else setError('');
                            }} required />
                            {images.length > 0 && <>
                                <small>Đã chọn {images.length} ảnh. Bấm vào dấu × để bỏ ảnh không muốn đăng.</small>
                                <div className="sell-image-previews">
                                    {images.map((image, index) => <div className="sell-image-preview" key={`${image.name}-${image.lastModified}-${index}`}>
                                        <img src={imagePreviews[index]} alt={`Xem trước ${image.name}`} />
                                        <span title={image.name}>{image.name}</span>
                                        <button type="button" aria-label={`Bỏ ảnh ${image.name}`} onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>×</button>
                                    </div>)}
                                </div>
                            </>}
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Đăng sản phẩm</button>
                    </form>
                </section>
            </main>
        </>
    );
};

export default Sell;
