import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ProductCard = ({ product }) => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [startingChat, setStartingChat] = useState(false);
    const [chatError, setChatError] = useState('');
    const isBuy = product.type === 'Bán';
    const label = isBuy ? 'BUY' : 'RENT';
    const badgeClass = isBuy ? 'buy' : 'rent';
    const priceLabel = isBuy ? 'Giá bán' : 'Giá thuê/ngày';
    const isOwnProduct = user && Number(user.user_id) === Number(product.user_id);

    const startChat = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setStartingChat(true);
        setChatError('');
        try {
            const response = await axios.post('/api/chat/conversations', { product_id: product.id });
            navigate(`/chat/${response.data.conversation_id}`);
        } catch (error) {
            setChatError(error.response?.data?.message || 'Không thể bắt đầu cuộc trò chuyện');
        } finally {
            setStartingChat(false);
        }
    };

    return (
        <article className="product-card">
            <Link to={`/product/${product.id}`} className="product-card-link">
                <span className={`product-type-badge ${badgeClass}`}>{label}</span>
                {product.status === 'SOLD' && <span className="product-status-badge">SOLD</span>}
                <img src={product.image_url} alt={product.name} className="product-image" />
                <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <div className="product-price">
                        {Number(product.price).toLocaleString('vi-VN')}đ
                        <span className="price-label"> ({priceLabel})</span>
                    </div>
                </div>
            </Link>
            {!isOwnProduct && <div className="product-card-chat-wrap">
                <button type="button" className="btn btn-outline product-card-chat" onClick={startChat} disabled={startingChat}>
                    <MessageCircle size={17} />{startingChat ? 'Đang mở chat...' : 'Chat với người bán'}
                </button>
                {chatError && <small className="product-card-chat-error">{chatError}</small>}
            </div>}
        </article>
    );
};

export default ProductCard;
