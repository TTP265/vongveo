import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

const ProductDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const { addToCart } = useContext(CartContext);
    const navigate = useNavigate();
    const isAdminView = location.pathname.startsWith('/admin/products/') && user?.role === 'admin';
    const [product, setProduct] = useState(null);
    const [imageUrls, setImageUrls] = useState([]);
    const [activeImage, setActiveImage] = useState('');
    const [error, setError] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });
    const [reviewMessage, setReviewMessage] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [rentDays, setRentDays] = useState(1);
    const [cartMessage, setCartMessage] = useState('');
    const [chatStarting, setChatStarting] = useState(false);
    const [chatError, setChatError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.get(isAdminView ? `/api/products/admin/${id}` : `/api/products/${id}`);
                setProduct(response.data);
                const imageResponse = await axios.get(isAdminView ? `/api/products/admin/${id}/images` : `/api/products/${id}/images`);
                const allImages = imageResponse.data.length ? imageResponse.data : [response.data.image_url].filter(Boolean);
                setImageUrls(allImages);
                setActiveImage(allImages[0] || '');
                if (!isAdminView) {
                    const reviewResponse = await axios.get(`/api/products/${id}/reviews`);
                    setReviews(reviewResponse.data);
                }
            } catch (requestError) {
                setError(requestError.response?.data?.message || 'Không thể tải thông tin sản phẩm');
            }
        };
        fetchProduct();
    }, [id, isAdminView]);

    const submitReview = async (event) => {
        event.preventDefault();
        setSavingReview(true);
        setReviewError('');
        setReviewMessage('');
        try {
            const response = await axios.post(`/api/products/${id}/reviews`, reviewForm);
            setReviewMessage(response.data.message);
            setReviewForm((current) => ({ ...current, comment: '' }));
            const reviewResponse = await axios.get(`/api/products/${id}/reviews`);
            setReviews(reviewResponse.data);
        } catch (requestError) {
            setReviewError(requestError.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setSavingReview(false);
        }
    };

    const averageRating = reviews.length
        ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
        : null;

    const deleteProduct = async () => {
        if (!window.confirm(`Xóa sản phẩm “${product.name}” khỏi hệ thống?`)) return;
        try {
            await axios.delete(`/api/products/admin/${product.id}`);
            navigate('/admin');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể xóa sản phẩm');
        }
    };

    const addProductToCart = (goToCart = false) => {
        addToCart(product, Number(rentDays));
        setCartMessage(`${product.name} đã được thêm vào giỏ hàng.`);
        if (goToCart) navigate('/cart');
    };

    const startChat = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setChatStarting(true);
        setChatError('');
        try {
            const response = await axios.post('/api/chat/conversations', { product_id: product.id });
            navigate(`/chat/${response.data.conversation_id}`);
        } catch (requestError) {
            setChatError(requestError.response?.data?.message || 'Không thể bắt đầu cuộc trò chuyện');
        } finally {
            setChatStarting(false);
        }
    };

    return (
        <>
            <Header />
            <main className="container detail-page">
                {error ? <div className="detail-message">{error}<p><Link to="/">Quay lại trang chủ</Link></p></div> : !product ? (
                    <div className="detail-message">Đang tải sản phẩm...</div>
                ) : (
                    <article className="detail-card">
                        <div className="detail-gallery">
                            <img src={activeImage || product.image_url} alt={product.name} className="detail-image" />
                            {imageUrls.length > 1 && <div className="detail-thumbnails">
                                {imageUrls.map((url) => <button type="button" className={`detail-thumbnail ${activeImage === url ? 'active' : ''}`} key={url} onClick={() => setActiveImage(url)} aria-label={`Xem ảnh sản phẩm`}><img src={url} alt="" /></button>)}
                            </div>}
                        </div>
                        <div className="detail-info">
                            <span className={`product-type-badge detail-badge ${product.type === 'Bán' ? 'buy' : 'rent'}`}>
                                {product.type === 'Bán' ? 'BUY' : 'RENT'}
                            </span>
                            {product.status === 'SOLD' && <span className="product-status-badge detail-sold-badge">SOLD</span>}
                            <h1>{product.name}</h1>
                            <div className="detail-price">
                                {Number(product.price).toLocaleString('vi-VN')}đ
                                <span>{product.type === 'Cho thuê' ? ' / ngày' : ''}</span>
                            </div>
                            <p><strong>Danh mục:</strong> {product.category}</p>
                            <p><strong>Người bán:</strong> {product.seller_name}</p>
                            {!isAdminView && Number(user?.user_id) !== Number(product.user_id) && (
                                <div className="detail-chat-action">
                                    {user ? (
                                        <button type="button" className="btn btn-outline" onClick={startChat} disabled={chatStarting}>
                                            {chatStarting ? 'Đang mở chat...' : 'Chat với người bán'}
                                        </button>
                                    ) : (
                                        <Link to="/login" className="btn btn-outline">Đăng nhập để chat với người bán</Link>
                                    )}
                                    {chatError && <p className="error-message">{chatError}</p>}
                                </div>
                            )}
                            <div className="detail-description">
                                <h2>Mô tả</h2>
                                <p>{product.description || 'Người đăng chưa thêm mô tả.'}</p>
                            </div>
                            {isAdminView ? (
                                <button type="button" className="btn btn-danger detail-action" onClick={deleteProduct}>
                                    Xóa sản phẩm
                                </button>
                            ) : product.status === 'SOLD' ? (
                                <p className="sold-notice">SOLD · Sản phẩm đã được xác nhận mua/thuê.</p>
                            ) : (
                                <>
                                    {product.type === 'Cho thuê' && (
                                        <label className="rent-days-control" htmlFor="rent-days">
                                            Số ngày thuê
                                            <input id="rent-days" type="number" min="1" max="365" value={rentDays} onChange={(event) => setRentDays(Math.min(365, Math.max(1, Number(event.target.value) || 1)))} />
                                        </label>
                                    )}
                                    {cartMessage && <p className="success-message">{cartMessage}</p>}
                                    <button type="button" className="btn btn-outline detail-action" onClick={() => addProductToCart(false)}>
                                        Thêm vào giỏ hàng
                                    </button>
                                    <button type="button" className="btn btn-primary detail-action" onClick={() => addProductToCart(true)}>
                                        {product.type === 'Bán' ? 'Mua ngay' : 'Đặt thuê ngay'}
                                    </button>
                                </>
                            )}
                            <Link to={isAdminView ? '/admin' : '/'} className="detail-back">← {isAdminView ? 'Quay lại quản lý sản phẩm' : 'Quay lại trang chủ'}</Link>
                        </div>
                    </article>
                )}
                {product && !isAdminView && (
                    <section className="reviews-section">
                        <h2>Đánh giá sản phẩm</h2>
                        <p className="reviews-summary">{averageRating ? `⭐ ${averageRating}/5 · ${reviews.length} đánh giá` : 'Chưa có đánh giá nào.'}</p>
                        {user && Number(user.user_id) !== Number(product.user_id) ? (
                            <form className="review-form" onSubmit={submitReview}>
                                <label className="form-label" htmlFor="review-rating">Số sao</label>
                                <select id="review-rating" className="form-input" value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}>
                                    <option value="5">5 sao - Rất tốt</option>
                                    <option value="4">4 sao - Tốt</option>
                                    <option value="3">3 sao - Bình thường</option>
                                    <option value="2">2 sao - Chưa tốt</option>
                                    <option value="1">1 sao - Kém</option>
                                </select>
                                <label className="form-label" htmlFor="review-comment">Nhận xét</label>
                                <textarea id="review-comment" className="form-input" rows="4" maxLength="1000" required value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..." />
                                {reviewError && <p className="error-message">{reviewError}</p>}
                                {reviewMessage && <p className="success-message">{reviewMessage}</p>}
                                <button type="submit" className="btn btn-primary" disabled={savingReview}>{savingReview ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
                            </form>
                        ) : !user ? (
                            <p><Link to="/login">Đăng nhập</Link> để viết đánh giá.</p>
                        ) : <p>Bạn không thể đánh giá sản phẩm của chính mình.</p>}
                        <div className="review-list">
                            {reviews.map((review) => (
                                <article className="review-item" key={review.id}>
                                    <strong>{review.reviewer_name}</strong>
                                    <span aria-label={`${review.rating} trên 5 sao`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} · {review.rating}/5</span>
                                    <p>{review.comment}</p>
                                    <small>{new Date(review.updated_at || review.created_at).toLocaleString('vi-VN')}</small>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </>
    );
};

export default ProductDetail;
