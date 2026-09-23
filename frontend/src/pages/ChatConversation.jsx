import { useCallback, useEffect, useRef, useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/Header';

const ChatConversation = () => {
    const { conversationId } = useParams();
    const { user } = useContext(AuthContext);
    const [data, setData] = useState({ conversation: null, messages: [] });
    const [body, setBody] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const refresh = useCallback(async () => {
        try {
            const response = await axios.get(`/api/chat/conversations/${conversationId}/messages`);
            setData(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải cuộc trò chuyện');
        }
    }, [conversationId]);
    useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, 3500);
        return () => window.clearInterval(timer);
    }, [refresh]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data.messages]);

    const send = async (event) => {
        event.preventDefault();
        const message = body.trim();
        if (!message || sending) return;
        setSending(true);
        setError('');
        try {
            await axios.post(`/api/chat/conversations/${conversationId}/messages`, { body: message });
            setBody('');
            await refresh();
        } catch (err) {
            setError(err.response?.data?.message || 'Không gửi được tin nhắn');
        } finally {
            setSending(false);
        }
    };

    const conversation = data.conversation;
    return <><Header /><main className="container chat-page">
        <Link to="/messages" className="detail-back">← Quay lại tin nhắn</Link>
        {error && <p className="error-message">{error}</p>}
        {conversation && <section className="chat-thread">
            <header className="chat-product-header">
                {conversation.product_image && <img src={conversation.product_image} alt="" />}
                <div><strong>{conversation.other_name}</strong><Link to={`/product/${conversation.product_id}`}>{conversation.product_name}</Link></div>
            </header>
            <div className="chat-message-list">
                {data.messages.map((message) => <div key={message.id} className={`chat-message-row ${Number(message.sender_id) === Number(user?.user_id) ? 'mine' : ''}`}>
                    <div className="chat-bubble"><small>{Number(message.sender_id) === Number(user?.user_id) ? 'Bạn' : message.sender_name}</small><p>{message.body}</p><time>{new Date(message.created_at.replace(' ', 'T') + 'Z').toLocaleString('vi-VN')}</time></div>
                </div>)}
                <div ref={bottomRef} />
            </div>
            <form className="chat-composer" onSubmit={send}>
                <textarea className="form-input" aria-label="Tin nhắn" placeholder="Nhập tin nhắn..." maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} />
                <button className="btn btn-primary" disabled={sending || !body.trim()}>{sending ? 'Đang gửi...' : 'Gửi'}</button>
            </form>
        </section>}
    </main></>;
};
export default ChatConversation;
