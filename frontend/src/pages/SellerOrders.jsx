import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/Header';

const SellerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [workingId, setWorkingId] = useState(null);

    const loadOrders = useCallback(async () => {
        setError('');
        try {
            const response = await axios.get('/api/orders/sales');
            setOrders(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể tải đơn bán ra');
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const updateStatus = async (itemId, status) => {
        setWorkingId(itemId);
        setError('');
        try {
            await axios.patch(`/api/orders/sales/${itemId}`, { status });
            await loadOrders();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái đơn');
        } finally {
            setWorkingId(null);
        }
    };

    return (
        <>
            <Header />
            <main className="container orders-page">
                <h1>Đơn bán ra</h1>
                <p className="admin-subtitle">Xem thông tin giao nhận, sau đó xác nhận hoặc từ chối từng yêu cầu mua/thuê cho sản phẩm của bạn.</p>
                {error && <div className="error-message">{error}</div>}
                {!error && orders.length === 0 ? <div className="cart-empty">Chưa có yêu cầu mua hoặc thuê sản phẩm của bạn.</div> : (
                    <div className="order-list">
                        {orders.map((order) => (
                            <article className="order-card" key={order.order_item_id}>
                                <div className="order-heading">
                                    <h2>Đơn #{order.order_id}</h2>
                                    <span>{order.item_status}</span>
                                </div>
                                <div className="order-product-line">
                                    <img className="order-product-image" src={order.product_image} alt={order.product_name} />
                                    <p><strong>{order.product_name}</strong> × {order.quantity}</p>
                                </div>
                                <p>Người mua/thuê: {order.buyer_name} ({order.buyer_email})</p>
                                <p>Người nhận: {order.shipping_name} · Điện thoại: {order.shipping_phone}</p>
                                <p>Địa chỉ: {order.shipping_address}</p>
                                {order.note && <p>Ghi chú: {order.note}</p>}
                                <p>{order.product_type === 'Cho thuê' ? 'Thuê' : 'Mua'} · Số lượng: {order.quantity}{order.product_type === 'Cho thuê' ? ` · ${order.rent_days} ngày` : ''} · Giá: {Number(order.price * order.quantity * (order.product_type === 'Cho thuê' ? order.rent_days : 1)).toLocaleString('vi-VN')}đ</p>
                                <p>Ngày đặt: {new Date(order.created_at).toLocaleString('vi-VN')}</p>
                                {order.item_status === 'Chờ xác nhận' && (
                                    <div className="admin-product-actions">
                                        <button type="button" className="btn btn-primary" disabled={workingId === order.order_item_id} onClick={() => updateStatus(order.order_item_id, 'Đã xác nhận')}>Xác nhận</button>
                                        <button type="button" className="btn btn-danger" disabled={workingId === order.order_item_id} onClick={() => updateStatus(order.order_item_id, 'Từ chối')}>Từ chối</button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
};

export default SellerOrders;
