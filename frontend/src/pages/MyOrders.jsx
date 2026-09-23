import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState('');
    const [workingOrderId, setWorkingOrderId] = useState(null);
    const [searchParams] = useSearchParams();

    const loadOrders = useCallback(() => axios.get('/api/orders/mine')
            .then((response) => {
                const grouped = new Map();
                response.data.forEach((row) => {
                    if (!grouped.has(row.id)) grouped.set(row.id, { ...row, items: [] });
                    if (row.product_id) grouped.get(row.id).items.push(row);
                });
                setOrders([...grouped.values()]);
            })
            .catch((requestError) => setError(requestError.response?.data?.message || 'Không thể tải đơn hàng')), []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const cancelOrder = async (order) => {
        if (!window.confirm(`Bạn có chắc muốn hủy đơn #${order.id}?`)) return;
        setWorkingOrderId(order.id);
        setError('');
        try {
            await axios.patch(`/api/orders/mine/${order.id}/cancel`);
            setOrders((current) => current.map((item) => item.id === order.id
                ? { ...item, status: 'Đã hủy', items: item.items.map((line) => ({ ...line, item_status: 'Đã hủy' })) }
                : item));
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể hủy đơn hàng');
        } finally {
            setWorkingOrderId(null);
        }
    };

    return (
        <>
            <Header />
            <main className="container orders-page">
                <h1>Đơn hàng của tôi</h1>
                {searchParams.get('placed') && <div className="success-message">Đặt hàng thành công. Đơn đang chờ người bán xác nhận.</div>}
                {error && <div className="error-message">{error}</div>}
                {!error && orders.length === 0 ? <div className="cart-empty">Bạn chưa có đơn hàng nào. <Link to="/">Tìm sản phẩm</Link></div> : (
                    <div className="order-list">
                        {orders.map((order) => (
                            <article className="order-card" key={order.id}>
                                <div className="order-heading">
                                    <h2>Đơn #{order.id}</h2>
                                    <span>{order.status}</span>
                                </div>
                                <p>Ngày đặt: {new Date(order.created_at).toLocaleString('vi-VN')}</p>
                                <p>Tài khoản đặt hàng: {order.account_name} ({order.account_email})</p>
                                <p>Người nhận: {order.shipping_name} · {order.shipping_phone}</p>
                                <p>Địa chỉ: {order.shipping_address}</p>
                                {order.note && <p>Ghi chú: {order.note}</p>}
                                {order.items.map((item) => (
                                    <div className="order-product-line" key={`${order.id}-${item.product_id}`}>
                                        <img className="order-product-image" src={item.image_url} alt={item.name} />
                                        <p>{item.name} × {item.quantity}{item.type === 'Cho thuê' ? ` · ${item.rent_days} ngày` : ''} — {Number(item.price * item.quantity * (item.type === 'Cho thuê' ? item.rent_days : 1)).toLocaleString('vi-VN')}đ · {item.item_status}</p>
                                    </div>
                                ))}
                                <strong>Tổng: {Number(order.total_amount).toLocaleString('vi-VN')}đ</strong>
                                {order.items.length > 0 && order.items.every((item) => item.item_status === 'Chờ xác nhận') && (
                                    <button type="button" className="btn btn-danger" disabled={workingOrderId === order.id} onClick={() => cancelOrder(order)}>
                                        {workingOrderId === order.id ? 'Đang hủy...' : 'Hủy đơn hàng'}
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
};

export default MyOrders;
