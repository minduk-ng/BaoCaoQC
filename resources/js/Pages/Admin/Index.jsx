import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { FiEdit2, FiTrash2, FiSearch, FiPlus, FiX } from 'react-icons/fi';

const ROLE_BADGE = {
    admin: 'badge-admin',
    viewer: 'badge-viewer',
    guest: 'badge-guest',
};

export default function AdminIndex({ users, roles, pages, search, currentUserId }) {
    const { flash } = usePage().props;
    const [activeTab, setActiveTab] = useState('users');
    const [searchTerm, setSearchTerm] = useState(search || '');

    // Role Modal
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState({
        name: '', display_name: '', description: '', allowed_customers: '', pages: []
    });

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchTerm !== search) {
                router.get('/admin', { search: searchTerm }, { preserveState: true, replace: true });
            }
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const openRoleModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleForm({
                name: role.name,
                display_name: role.display_name || '',
                description: role.description || '',
                allowed_customers: role.allowed_customers?.join(', ') || '',
                pages: role.page_ids || []
            });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', display_name: '', description: '', allowed_customers: '', pages: [] });
        }
        setIsRoleModalOpen(true);
    };

    const handleRoleSubmit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => setIsRoleModalOpen(false) };
        editingRole
            ? router.put(`/admin/roles/${editingRole.id}`, roleForm, opts)
            : router.post('/admin/roles', roleForm, opts);
    };

    const handleDeleteRole = (role) => {
        if (role.is_system) return alert('Không thể xóa quyền hệ thống.');
        if (role.user_count > 0) return alert('Không thể xóa quyền đang có người dùng.');
        if (confirm(`Bạn có chắc muốn xóa quyền "${role.display_name}"?`)) {
            router.delete(`/admin/roles/${role.id}`);
        }
    };

    const togglePage = (id) => {
        setRoleForm(p => ({
            ...p,
            pages: p.pages.includes(id) ? p.pages.filter(x => x !== id) : [...p.pages, id]
        }));
    };

    const handleAssignRole = (userId, roleId) => {
        router.post('/admin/users', { user_id: userId, role_id: roleId }, { preserveScroll: true });
    };

    const handleDeleteUser = (user) => {
        if (user.id === currentUserId) return alert('Không thể xóa chính mình.');
        if (confirm(`Bạn có chắc muốn xóa người dùng "${user.name}"?`)) {
            router.delete(`/admin/users/${user.id}/delete`);
        }
    };

    return (
        <MainLayout>
            <Head title="Quản lý hệ thống" />

            {/* Page header — same pattern as Report/TopCampaign */}
            <div className="page-header" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div className="page-header-icon">⚙️</div>
                <div>
                    <h1>Quản lý Phân quyền</h1>
                    <p>Cấu hình roles, pages và tài khoản người dùng</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs" style={{ marginBottom: 24 }}>
                <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    Quản lý Users
                </button>
                <button className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
                    Quản lý Roles
                </button>
            </div>

            {/* Flash */}
            {flash?.success && <div className="admin-flash success">{flash.success}</div>}
            {flash?.error && <div className="admin-flash error">{flash.error}</div>}

            
            {/* ========== USERS TAB ========== */}
            {activeTab === 'users' && (
                <div className="admin-card">
                    <div className="admin-card-header">
                        <span className="admin-card-title">Danh sách Người dùng</span>
                        <div className="admin-search-wrapper">
                            <FiSearch className="admin-search-icon" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên hoặc email..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="admin-search-input"
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Người dùng</th>
                                    <th>Quyền hiện tại</th>
                                    <th>Đăng nhập lần cuối</th>
                                    <th className="text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="admin-user-cell">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt="" className="admin-user-avatar" />
                                                ) : (
                                                    <div className="admin-user-avatar-placeholder">{user.name.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <div className="admin-user-name">{user.name}</div>
                                                    <div className="admin-user-email">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <select
                                                value={user.role_id || ''}
                                                onChange={e => handleAssignRole(user.id, e.target.value)}
                                                disabled={user.id === currentUserId}
                                                className="admin-role-select"
                                            >
                                                <option value="" disabled>-- Chưa có quyền --</option>
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.display_name} ({r.name})</option>
                                                ))}
                                            </select>
                                            <div style={{ marginTop: 6 }}>
                                                <span className={`badge ${ROLE_BADGE[user.role] || 'badge-guest'}`}>{user.role}</span>
                                            </div>
                                        </td>
                                        <td>{user.last_login_at || 'Chưa đăng nhập'}</td>
                                        <td>
                                            <div className="admin-actions">
                                                {user.id !== currentUserId && user.email !== 'minhducqwe0123@gmail.com' && (
                                                    <button className="btn-admin-delete" onClick={() => handleDeleteUser(user)}>
                                                        <FiTrash2 /> Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.data.length === 0 && (
                                    <tr><td colSpan="4" className="admin-empty">Không tìm thấy người dùng nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.links && users.links.length > 3 && (
                        <div className="admin-pagination">
                            {users.links.map((link, i) => (
                                <button
                                    key={i}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                    disabled={!link.url || link.active}
                                    className={`admin-pagination-btn ${link.active ? 'active' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========== ROLES TAB ========== */}
            {activeTab === 'roles' && (
                <div className="admin-card">
                    <div className="admin-card-header">
                        <span className="admin-card-title">Danh sách Quyền (Roles)</span>
                        <button className="btn-admin-primary" onClick={() => openRoleModal()}>
                            <FiPlus /> Thêm Role
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Tên Role</th>
                                    <th>Mô tả</th>
                                    <th>Customers</th>
                                    <th>Pages</th>
                                    <th className="text-center">Trạng thái</th>
                                    <th className="text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map(role => (
                                    <tr key={role.id}>
                                        <td>
                                            <div className="admin-user-name">{role.display_name}</div>
                                            <span className="slug-code">{role.name}</span>
                                        </td>
                                        <td>{role.description}</td>
                                        <td>
                                            {(role.allowed_customers || []).map((c, i) => (
                                                <span key={i} className="tag-chip tag-accent">{c}</span>
                                            ))}
                                        </td>
                                        <td>
                                            {(role.page_slugs || []).map((p, i) => (
                                                <span key={i} className="tag-chip tag-green">{p}</span>
                                            ))}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${role.is_system ? 'badge-system' : 'badge-custom'}`}>
                                                {role.is_system ? 'System' : 'Custom'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="admin-actions">
                                                <button className="admin-icon-btn edit" onClick={() => openRoleModal(role)} title="Sửa">
                                                    <FiEdit2 size={16} />
                                                </button>
                                                {!role.is_system && (
                                                    <button className="admin-icon-btn delete" onClick={() => handleDeleteRole(role)} title="Xóa">
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========== ROLE MODAL ========== */}
            {isRoleModalOpen && (
                <div className="overlay" onClick={() => setIsRoleModalOpen(false)}>
                    <div className="modal" style={{ width: 620 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editingRole ? 'Chỉnh sửa Quyền' : 'Thêm Quyền mới'}</span>
                            <button className="modal-close" onClick={() => setIsRoleModalOpen(false)}>
                                <FiX />
                            </button>
                        </div>

                        <form id="roleForm" onSubmit={handleRoleSubmit}>
                            <div className="admin-modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Mã Role (slug) *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={roleForm.name}
                                            onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                            disabled={editingRole?.is_system}
                                            placeholder="vd: marketing_manager"
                                            required
                                        />
                                        {editingRole?.is_system && <p className="form-warn">Không thể đổi mã của role hệ thống.</p>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tên hiển thị</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={roleForm.display_name}
                                            onChange={e => setRoleForm({ ...roleForm, display_name: e.target.value })}
                                            placeholder="vd: Quản lý Marketing"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Mô tả</label>
                                    <textarea
                                        className="form-input"
                                        value={roleForm.description}
                                        onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                                        placeholder="Mô tả quyền hạn..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Customer được phép</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={roleForm.allowed_customers}
                                        onChange={e => setRoleForm({ ...roleForm, allowed_customers: e.target.value })}
                                        placeholder="vd: cus1, cus2 hoặc nhập * để xem tất cả"
                                    />
                                    <p className="form-hint">Nhập mã customers cách nhau bằng dấu phẩy. Nhập <code>*</code> để cho phép xem tất cả. Bỏ trống = không xem được gì.</p>
                                </div>

                                <div className="admin-pages-section">
                                    <label>Trang được phép truy cập</label>
                                    <div className="page-checks-grid">
                                        {pages.map(page => (
                                            <label key={page.id} className={`page-check ${roleForm.pages.includes(page.id) ? 'checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={roleForm.pages.includes(page.id)}
                                                    onChange={() => togglePage(page.id)}
                                                />
                                                <div>
                                                    <div className="page-check-label">{page.label}</div>
                                                    <div className="page-check-slug">{page.slug}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-modal secondary" onClick={() => setIsRoleModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn-modal primary">Lưu Thay Đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
