import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUrl';
import axios from 'axios';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

const lineTotal = (item) => item.price * item.quantity * (item.type === 'Cho thuê' ? item.rentDays : 1);

const Cart = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { items, updateItem, removeItem, removeItems } = useContext(CartContext);
    const [selectedIds, setSelectedIds] = useState(() => items.map((item) => item.id));
    const [error, setError] = useState('');
    const [placingOrder, setPlacingOrder] = useState(false);
    const [shipping, setShipping] = useState({ shipping_name: user?.name || '', shipping_phone: user?.phone || '', shipping_address: user?.address || '', note: '' });
    useEffect(() => {
        const validIds = new Set(items.map((item) => item.id));
        setSelectedIds((current) => current.filter((id) => validIds.has(id)));
    }, [items]);

    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    const total = selectedItems.reduce((sum, item) => sum + lineTotal(item), 0);
    const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

    const placeOrder = async () => {
        if (!user || selectedItems.length === 0) return;
        setPlacingOrder(true);
        setError('');
        try {
            const response = await axios.post('/api/orders', {
                items: selectedItems.map((item) => ({ product_id: item.id, quantity: item.quantity, rent_days: item.rentDays })),
                ...shipping,
            });
            removeItems(selectedItems.map((item) => item.id));
            navigate(`/my-orders?placed=${response.data.order_id}`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể đặt hàng. Vui lòng thử lại.');
        } finally {
            setPlacingOrder(false);
        }
    };

    return (
        <>
            <Header />
            <main className="container cart-page">
                <h1>Giỏ hàng</h1>
                {error && <div className="error-message">{error}</div>}
                {items.length === 0 ? (
                    <section className="cart-empty">
                        <p>Giỏ hàng của bạn đang trống.</p>
                        <Link className="btn btn-primary" to="/">Tiếp tục xem sản phẩm</Link>
                    </section>
                ) : (
                    <div className="cart-layout">
                        <div className="cart-items">
                            <label className="cart-select-all">
                                <input type="checkbox" checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])} />
                                Chọn tất cả sản phẩm
                            </label>
                            {items.map((item) => (
                                <article className="cart-item" key={item.id}>
                                    <img src={getImageUrl(item.image_url)} alt={item.name} />
                                    <div className="cart-item-info">
                                        <label className="cart-item-select">
                                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                                            Chọn sản phẩm này
                                        </label>
                                        <h2>{item.name}</h2>
                                        <p>{Number(item.price).toLocaleString('vi-VN')}đ{item.type === 'Cho thuê' ? ' / ngày thuê' : ' / sản phẩm'}</p>
                                        <label>Số lượng
                                            <input type="number" min="1" max="50" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.min(50, Math.max(1, Number(event.target.value) || 1)) })} />
                                        </label>
                                        {item.type === 'Cho thuê' && <label>Số ngày thuê
                                            <input type="number" min="1" max="365" value={item.rentDays} onChange={(event) => updateItem(item.id, { rentDays: Math.min(365, Math.max(1, Number(event.target.value) || 1)) })} />
                                        </label>}
                                        <strong>Thành tiền: {lineTotal(item).toLocaleString('vi-VN')}đ</strong>
                                        <button type="button" className="btn btn-danger" onClick={() => removeItem(item.id)}>Xóa khỏi giỏ</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <aside className="cart-summary">
                            <h2>Tổng cộng</h2>
                            <p>{total.toLocaleString('vi-VN')}đ</p>
                            <small>Đã chọn {selectedItems.length}/{items.length} sản phẩm</small>
                            <small>Đơn sẽ được gửi đến người bán để xác nhận. Hiện chưa hỗ trợ thanh toán trực tuyến.</small>
                            {user ? (
                                <>
                                    <label className="form-label" htmlFor="shipping-name">Họ tên người nhận</label>
                                    <input id="shipping-name" className="form-input" maxLength="100" required value={shipping.shipping_name} onChange={(event) => setShipping((value) => ({ ...value, shipping_name: event.target.value }))} />
                                    <label className="form-label" htmlFor="shipping-phone">Số điện thoại</label>
                                    <input id="shipping-phone" className="form-input" type="tel" autoComplete="tel" maxLength="20" required value={shipping.shipping_phone} onChange={(event) => setShipping((value) => ({ ...value, shipping_phone: event.target.value }))} />
                                    <label className="form-label" htmlFor="shipping-address">Địa chỉ nhận hàng / giao nhận</label>
                                    <textarea id="shipping-address" className="form-input" rows="3" maxLength="300" required value={shipping.shipping_address} onChange={(event) => setShipping((value) => ({ ...value, shipping_address: event.target.value }))} />
                                    <label className="form-label" htmlFor="shipping-note">Ghi chú (không bắt buộc)</label>
                                    <textarea id="shipping-note" className="form-input" rows="2" maxLength="500" value={shipping.note} onChange={(event) => setShipping((value) => ({ ...value, note: event.target.value }))} />
                                    <button type="button" className="btn btn-primary" disabled={placingOrder || selectedItems.length === 0 || !shipping.shipping_name.trim() || !shipping.shipping_phone.trim() || !shipping.shipping_address.trim()} onClick={placeOrder}>
                                        {placingOrder ? 'Đang đặt hàng...' : 'Đặt hàng'}
                                    </button>
                                </>
                            ) : (
                                <Link className="btn btn-primary" to="/login">Đăng nhập để đặt hàng</Link>
                            )}
                        </aside>
                    </div>
                )}
            </main>
        </>
    );
};

export default Cart;
