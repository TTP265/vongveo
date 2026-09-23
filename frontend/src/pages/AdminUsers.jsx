import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const emptyForm = { name: '', email: '', role: 'user', phone: '', address: '', password: '' };

const AdminUsers = () => {
    const { user: currentUser, updateUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('/api/auth/users');
            setUsers(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể tải danh sách tài khoản');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

    const startEditing = (target) => {
        setEditingId(target.id);
        setForm({ name: target.name, email: target.email, role: target.role, phone: target.phone || '', address: target.address || '', password: '' });
        setError('');
        setMessage('');
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const saveUser = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            if (editingId) {
                const response = await axios.patch(`/api/auth/users/${editingId}`, form);
                setUsers((current) => current.map((item) => item.id === editingId ? response.data.user : item));
                if (editingId === currentUser?.user_id) updateUser(response.data.user);
                setMessage(response.data.message);
            } else {
                const response = await axios.post('/api/auth/users', form);
                setUsers((current) => [...current, response.data.user].sort((a, b) => a.id - b.id));
                setMessage(response.data.message);
            }
            resetForm();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể lưu tài khoản');
        } finally {
            setSaving(false);
        }
    };

    const deleteUser = async (target) => {
        if (!window.confirm(`Xóa tài khoản ${target.name} (${target.email})? Tài khoản sẽ không thể đăng nhập; dữ liệu sản phẩm và đơn cũ sẽ được giữ lại.`)) return;
        setError('');
        setMessage('');
        try {
            const response = await axios.delete(`/api/auth/users/${target.id}`);
            setUsers((current) => current.filter((item) => item.id !== target.id));
            setMessage(response.data.message);
            if (editingId === target.id) resetForm();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể xóa tài khoản');
        }
    };

    return (
        <>
            <Header />
            <main className="container admin-page">
                <div className="admin-users-heading">
                    <div>
                        <h1>Quản lý người dùng</h1>
                        <p className="admin-subtitle">Tạo, cập nhật thông tin và phân quyền tài khoản.</p>
                    </div>
                    <Link className="btn btn-outline" to="/admin">Quay lại quản lý sản phẩm</Link>
                </div>

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <section className="account-card admin-user-form-card">
                    <h2>{editingId ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</h2>
                    <form className="admin-user-form" onSubmit={saveUser}>
                        <label className="form-group">
                            <span className="form-label">Họ tên</span>
                            <input name="name" className="form-input" minLength="2" maxLength="100" required value={form.name} onChange={updateField} />
                        </label>
                        <label className="form-group">
                            <span className="form-label">Email</span>
                            <input name="email" type="email" className="form-input" required value={form.email} onChange={updateField} />
                        </label>
                        <label className="form-group">
                            <span className="form-label">Vai trò</span>
                            <select name="role" className="form-input" value={form.role} onChange={updateField}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>
                        <label className="form-group">
                            <span className="form-label">Số điện thoại</span>
                            <input name="phone" type="tel" className="form-input" value={form.phone} onChange={updateField} />
                        </label>
                        <label className="form-group admin-user-address">
                            <span className="form-label">Địa chỉ</span>
                            <textarea name="address" className="form-input" rows="2" maxLength="300" value={form.address} onChange={updateField} />
                        </label>
                        <label className="form-group admin-user-password">
                            <span className="form-label">{editingId ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu'}</span>
                            <input name="password" type="password" className="form-input" minLength="8" maxLength="100" required={!editingId} value={form.password} onChange={updateField} autoComplete="new-password" />
                        </label>
                        <div className="admin-user-form-actions">
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button>
                            {editingId && <button type="button" className="btn btn-outline" onClick={resetForm} disabled={saving}>Hủy sửa</button>}
                        </div>
                    </form>
                </section>

                <h2 className="admin-users-list-title">Tài khoản đang hoạt động</h2>
                {loading ? <p>Đang tải danh sách...</p> : users.length === 0 ? (
                    <div className="admin-empty">Chưa có tài khoản nào.</div>
                ) : (
                    <div className="admin-user-list">
                        {users.map((target) => (
                            <article className="admin-user-card" key={target.id}>
                                <div className="admin-user-avatar">
                                    {target.profile_image ? <img src={target.profile_image} alt="" /> : <span>{target.name.charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="admin-user-info">
                                    <h3>{target.name} {target.id === currentUser?.user_id && <small>(bạn)</small>}</h3>
                                    <p>{target.email}</p>
                                    <p>{target.phone || 'Chưa có số điện thoại'} · {target.address || 'Chưa có địa chỉ'}</p>
                                    <span className={`admin-role-badge ${target.role}`}>{target.role === 'admin' ? 'Admin' : 'User'}</span>
                                </div>
                                <div className="admin-product-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => startEditing(target)}>Sửa</button>
                                    <button type="button" className="btn btn-danger" disabled={target.id === currentUser?.user_id} onClick={() => deleteUser(target)}>Xóa</button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
};

export default AdminUsers;
