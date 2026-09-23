import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle } from 'lucide-react';
import Header from '../components/Header';

const Messages = () => {
    const [conversations, setConversations] = useState([]);
    const [error, setError] = useState('');
    const refresh = useCallback(async () => {
        try {
            const response = await axios.get('/api/chat/conversations');
            setConversations(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải tin nhắn');
        }
    }, []);
    useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, 8000);
        return () => window.clearInterval(timer);
    }, [refresh]);

    return <><Header /><main className="container chat-page">
        <h1>Tin nhắn</h1>
        <p className="chat-subtitle">Trao đổi với người mua hoặc người bán về sản phẩm.</p>
        {error && <p className="error-message">{error}</p>}
        {!conversations.length ? <div className="chat-empty"><MessageCircle size={32} /><p>Bạn chưa có cuộc trò chuyện nào.</p><Link to="/" className="btn btn-primary">Tìm sản phẩm</Link></div> :
            <div className="chat-list">{conversations.map((item) => <Link className="chat-conversation-card" to={`/chat/${item.id}`} key={item.id}>
                {item.product_image ? <img src={item.product_image} alt="" /> : <span className="chat-image-placeholder">Ảnh</span>}
                <span className="chat-conversation-info"><strong>{item.other_name}</strong><b>{item.product_name}</b><small>{item.last_message || 'Bắt đầu trò chuyện'}</small></span>
                {Number(item.unread_count) > 0 && <span className="chat-unread-count">{item.unread_count}</span>}
            </Link>)}</div>}
    </main></>;
};
export default Messages;
