import { useContext } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Sell from './pages/Sell';
import ProductDetail from './pages/ProductDetail';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';
import MyProducts from './pages/MyProducts';
import Cart from './pages/Cart';
import MyOrders from './pages/MyOrders';
import SellerOrders from './pages/SellerOrders';
import Account from './pages/Account';
import Messages from './pages/Messages';
import ChatConversation from './pages/ChatConversation';
import { AuthContext } from './context/AuthContext';
import './App.css'; // Mặc định Vite, ta có thể giữ hoặc xóa
import './index.css'; 

function App() {
  const { user, loading } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/sell" element={<Sell />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/messages" element={loading ? null : user ? <Messages /> : <Navigate to="/login" replace />} />
      <Route path="/chat/:conversationId" element={loading ? null : user ? <ChatConversation /> : <Navigate to="/login" replace />} />
      <Route path="/my-orders" element={loading ? null : user ? <MyOrders /> : <Navigate to="/login" replace />} />
      <Route path="/seller-orders" element={loading ? null : user ? <SellerOrders /> : <Navigate to="/login" replace />} />
      <Route path="/account" element={loading ? null : user ? <Account /> : <Navigate to="/login" replace />} />
      <Route
        path="/my-products"
        element={loading ? null : user ? <MyProducts /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin"
        element={loading ? null : user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />}
      />
      <Route
        path="/admin/users"
        element={loading ? null : user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/" replace />}
      />
      <Route
        path="/admin/products/:id"
        element={loading ? null : user?.role === 'admin' ? <ProductDetail /> : <Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App;
