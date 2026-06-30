# Edit Compare Dataset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to edit an existing dataset in the Compare page by clicking an edit button, which opens the existing modal pre-filled with the dataset's data.

**Architecture:** We will add an edit icon to `DatasetList.jsx`, a new state `editingDataset` in `Compare/Index.jsx`, and a `useEffect` in `AddDatasetModal.jsx` to pre-fill the form fields.

**Tech Stack:** React, Inertia

## Global Constraints
- React Hooks only (useState, useCallback, useEffect)
- Maintain existing styling structure in `app.css`

---

### Task 1: Add Edit Button to DatasetList

**Files:**
- Modify: `d:\laravel\test\resources\js\Pages\Compare\DatasetList.jsx`

**Interfaces:**
- Consumes: A new prop `onEdit(dataset)` passed from `Index.jsx`
- Produces: Triggers `onEdit` when the pencil icon is clicked.

- [ ] **Step 1: Update DatasetList.jsx to add onEdit prop and button**

```jsx
// Replace in d:\laravel\test\resources\js\Pages\Compare\DatasetList.jsx
import React, { memo } from 'react';

const DATASET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DatasetList = memo(function DatasetList({ datasets, totalSources, onRemove, onEdit }) {
    if (!datasets || datasets.length === 0) {
        return (
            <div className="dataset-empty">
                Chưa có dữ liệu so sánh.<br />Vui lòng thêm bộ dữ liệu.
            </div>
        );
    }

    return (
        <div className="dataset-list">
            {datasets.map((ds, idx) => {
                const colorClass = 'ds-color-' + (idx % DATASET_COLORS.length);
                const sourceText = ds.sources.length === totalSources ? 'Tất cả kênh' : ds.sources.join(', ');
                const daysCount = ds.data ? ds.data.days.length : 0;
                const daysWithData = ds.data?.days_with_data ?? 0;

                return (
                    <div key={ds.id} className={`dataset-card ${colorClass}`}>
                        <button
                            className="dataset-card-remove"
                            onClick={() => onRemove(ds.id)}
                            title="Xoá"
                        >✕</button>
                        <button
                            className="dataset-card-edit"
                            onClick={() => onEdit(ds)}
                            title="Sửa"
                            style={{
                                position: 'absolute', top: '8px', right: '32px',
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', padding: '4px', fontSize: '14px'
                            }}
                        >✏️</button>
                        <div
                            className="dataset-card-name"
                            style={{ color: DATASET_COLORS[idx % DATASET_COLORS.length] }}
                        >
                            {ds.name}
                        </div>
                        <div className="dataset-card-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                            </svg>
                            {ds.originalDateFrom} — {ds.originalDateTo}<br />
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            {ds.customer || 'Tất cả'}<br />
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            {sourceText}
                        </div>
                        <div className="dataset-card-status">
                            <span style={{ color: daysWithData === 0 ? 'var(--danger)' : 'var(--success)' }}>
                                •
                            </span> {daysWithData} ngày dữ liệu / {daysCount} ngày
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default DatasetList;
```

---

### Task 2: Manage Editing State in Compare/Index.jsx

**Files:**
- Modify: `d:\laravel\test\resources\js\Pages\Compare\Index.jsx`

**Interfaces:**
- Consumes: The `dataset` object from `onEdit` callback.
- Produces: A new `editingDataset` prop passed down to `AddDatasetModal`.

- [ ] **Step 1: Add state and edit handler**

```jsx
// Find the state declarations in Index.jsx
    const [currentCurrency, setCurrentCurrency] = useState('vnd');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [nextId, setNextId] = useState(1);
    const [editingDataset, setEditingDataset] = useState(null); // ADD THIS

// Add the handler before fetchData
    const handleEditDataset = useCallback((dataset) => {
        setEditingDataset(dataset);
        setIsModalOpen(true);
    }, []);
```

- [ ] **Step 2: Update handleSaveDataset**

```jsx
// Replace handleSaveDataset
    // Add or Edit dataset
    const handleSaveDataset = useCallback(async (formData) => {
        setIsModalOpen(false);
        setIsLoading(true);

        const isEditing = editingDataset !== null;
        const dsId = isEditing ? editingDataset.id : nextId;

        const ds = {
            id: dsId,
            name: formData.name,
            customer: formData.customer,
            dateFrom: formData.dateFrom,
            dateTo: formData.dateTo,
            originalDateFrom: formData.dateFrom,
            originalDateTo: formData.dateTo,
            sources: formData.sources,
            data: null,
        };

        try {
            ds.data = await fetchData(ds, currentCurrency);
            
            if (isEditing) {
                // Ghi đè vào mảng cũ
                setDatasets(prev => prev.map(item => item.id === dsId ? ds : item));
                setEditingDataset(null);
            } else {
                setDatasets(prev => [...prev, ds]);
                setNextId(prev => prev + 1);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            alert('Lỗi khi lấy dữ liệu. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [nextId, currentCurrency, fetchData, editingDataset]);

// Update the modal close handler to reset editingDataset
    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingDataset(null);
    }, []);
```

- [ ] **Step 3: Update props in return block**

```jsx
// Update DatasetList props
                        <DatasetList
                            datasets={datasets}
                            totalSources={allSources.length}
                            onRemove={handleRemoveDataset}
                            onEdit={handleEditDataset}
                        />

// Update AddDatasetModal props
            <AddDatasetModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveDataset}
                customerNames={customerNames}
                allSources={allSources}
                nextId={nextId}
                editingDataset={editingDataset}
            />
```

---

### Task 3: Pre-fill AddDatasetModal

**Files:**
- Modify: `d:\laravel\test\resources\js\Pages\Compare\AddDatasetModal.jsx`

**Interfaces:**
- Consumes: The `editingDataset` prop.

- [ ] **Step 1: Add useEffect to populate form and fix title**

```jsx
// Replace in d:\laravel\test\resources\js\Pages\Compare\AddDatasetModal.jsx
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
                    <button type="button" className="btn-secondary" onClick={onClose}>Huỷ</button>
                    <button type="button" className="btn-primary" onClick={handleSave}>
                        {isEditing ? 'Cập nhật' : 'Thêm dữ liệu'}
                    </button>
                </>
            }
        >
            <div className="modal-form">
                {/* Form elements remain exactly the same */}
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

                <div className="form-group">
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
                </div>

                <div className="form-group">
                    <label className="form-label">Khoảng thời gian</label>
                    <DateRangePicker
                        initialStart={dateFrom}
                        initialEnd={dateTo}
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
```
