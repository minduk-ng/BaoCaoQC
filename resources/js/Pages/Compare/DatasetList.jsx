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
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            {ds.customer || 'Tất cả'}<br />
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
                            </svg>
                            {sourceText}
                        </div>
                        {ds.data && (
                            <div className="dataset-card-info" style={{ marginTop: '4px', color: 'var(--green)' }}>
                                ● {daysWithData} ngày dữ liệu / {daysCount} ngày
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

export default DatasetList;
