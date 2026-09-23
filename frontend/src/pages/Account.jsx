import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';

const Account = () => {
    const { user, updateUser } = useContext(AuthContext);
    const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
    const [profileImage, setProfileImage] = useState('');
    const [newImage, setNewImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        axios.get('/api/auth/me')
            .then((response) => {
                const profile = response.data;
                setForm({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '', address: profile.address || '' });
                setProfileImage(profile.profile_image || '');
                updateUser(profile);
            })
            .catch((requestError) => setError(requestError.response?.data?.message || 'Không thể tải thông tin tài khoản'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!newImage) {
            setPreviewUrl('');
            return undefined;
        }
        const objectUrl = URL.createObjectURL(newImage);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [newImage]);

    const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        if (newImage) data.append('profile_image', newImage);
        try {
            const response = await axios.patch('/api/auth/me', data);
            updateUser(response.data.user, response.data.token);
            setProfileImage(response.data.user.profile_image || '');
            setNewImage(null);
            setSuccess(response.data.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Không thể cập nhật tài khoản');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Header />
            <main className="container account-page">
                <section className="account-card">
                    <h1>Quản lý tài khoản</h1>
                    <p className="admin-subtitle">Cập nhật thông tin cá nhân và ảnh đại diện của bạn.</p>
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    {loading ? <p>Đang tải thông tin tài khoản...</p> : (
                        <form onSubmit={saveProfile}>
                            <div className="profile-photo-control">
                                {previewUrl || profileImage
                                    ? <img src={previewUrl || profileImage} alt="Ảnh đại diện xem trước" />
                                    : <span>{form.name?.charAt(0)?.toUpperCase() || 'U'}</span>}
                                <div>
                                    <label className="form-label" htmlFor="profile-image">Ảnh đại diện (JPG, PNG, WEBP hoặc GIF; tối đa 5 MB)</label>
                                    <input id="profile-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="form-input" onChange={(event) => setNewImage(event.target.files?.[0] || null)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="account-name">Họ tên</label>
                                <input id="account-name" name="name" className="form-input" minLength="2" maxLength="100" required value={form.name} onChange={updateField} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="account-email">Email</label>
                                <input id="account-email" name="email" type="email" className="form-input" required value={form.email} onChange={updateField} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="account-phone">Số điện thoại</label>
                                <input id="account-phone" name="phone" type="tel" autoComplete="tel" maxLength="20" className="form-input" value={form.phone} onChange={updateField} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="account-address">Địa chỉ</label>
                                <textarea id="account-address" name="address" rows="3" maxLength="300" className="form-input" value={form.address} onChange={updateField} />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                        </form>
                    )}
                </section>
            </main>
        </>
    );
};

export default Account;
