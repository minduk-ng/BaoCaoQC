import React, { useState, useCallback, useEffect } from 'react';
import Modal from '../../Components/UI/Modal';
import Dropdown from '../../Components/UI/Dropdown';
import DateRangePicker from '../../Components/UI/DateRangePicker';

export default function AddDatasetModal({ isOpen, onClose, onSave, customerNames, allSources, nextId, editingDataset }) {
    const [name, setName] = useState(`Data #${nextId}`);
    const [customer, setCustomer] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sources, setSources] = useState(allSources);

    // Reset or pre-fill form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (editingDataset) {
                setName(editingDataset.name);
                setCustomer(editingDataset.customer);
                setDateFrom(editingDataset.originalDateFrom);
                setDateTo(editingDataset.originalDateTo);
                setSources(editingDataset.sources);
            } else {
                setName(`Data #${nextId}`);
                setCustomer('');
                
                // Mặc định 30 ngày gần nhất
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 30);
                
                setDateTo(end.toISOString().split('T')[0]);
                setDateFrom(start.toISOString().split('T')[0]);
                setSources(allSources);
            }
        }
    }, [isOpen, editingDataset, nextId, allSources]);

    const handleSave = () => {
        if (!name.trim()) return alert('Vui lòng nhập tên bộ dữ liệu');
        if (!dateFrom || !dateTo) return alert('Vui lòng chọn khoảng thời gian');
        if (sources.length === 0) return alert('Vui lòng chọn ít nhất 1 nguồn dữ liệu');
        if (dateFrom > dateTo) return alert('Ngày bắt đầu không thể lớn hơn ngày kết thúc');

        onSave({ name, customer, dateFrom, dateTo, sources });
    };

    const toggleSource = useCallback((src) => {
        setSources(prev => {
            if (prev.includes(src)) return prev.filter(s => s !== src);
            return [...prev, src];
        });
    }, []);

    const isEditing = editingDataset !== null && editingDataset !== undefined;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? `Sửa bộ dữ liệu` : `Thêm bộ dữ liệu mới`}
            maxWidth="md"
            footer={
                <>
                    <button type="button" className="btn-modal secondary" onClick={onClose}>Huỷ</button>
                    <button type="button" className="btn-modal primary" onClick={handleSave}>
                        {isEditing ? 'Cập nhật' : 'Thêm dữ liệu'}
                    </button>
                </>
            }
        >
            <div className="modal-form">
                <div className="form-group">
                    <label className="form-label">Tên bộ dữ liệu</label>
                    <input
                        type="text"
                        className="form-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`Data #${nextId}`}
                    />
                </div>

                {/* <div className="form-group">
                    <label className="form-label">Sản phẩm (Customer)</label>
                    <Dropdown
                        label={customer || 'Tất cả sản phẩm'}
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        }
                    >
                        <div className="dropdown-item" onClick={() => setCustomer('')}>
                            <span className={customer === '' ? 'text-primary' : ''}>Tất cả sản phẩm</span>
                        </div>
                        {customerNames.map(c => (
                            <div key={c} className="dropdown-item" onClick={() => setCustomer(c)}>
                                <span className={customer === c ? 'text-primary' : ''}>{c}</span>
                            </div>
                        ))}
                    </Dropdown>
                </div> */}
                <div className="form-group">
                <label className="form-label">Customer</label>
                <select
                    className="form-select"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                >
                    <option value="">Tất cả</option>
                    {customerNames.map(n => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Khoảng thời gian</label>
                    <DateRangePicker
                        // initialStart={dateFrom}
                        // initialEnd={dateTo}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onChange={(s, e) => { setDateFrom(s); setDateTo(e); }}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Nguồn dữ liệu ({sources.length}/{allSources.length})</label>
                    <div className="source-checkbox-grid" style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', 
                        background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px'
                    }}>
                        {allSources.map(src => (
                            <label key={src} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                <input
                                    type="checkbox"
                                    checked={sources.includes(src)}
                                    onChange={() => toggleSource(src)}
                                />
                                {src}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
