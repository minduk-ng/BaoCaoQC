import React, { useState, useMemo, useCallback, memo } from 'react';

const TopTable = memo(function TopTable({ topData, currency, visibleColumns, sortCol, sortDir, onSortChange }) {
    

    // Phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const columns = useMemo(() => [
        { key: 'stt', label: 'STT', type: 'number' },
        { key: 'campaign_name', label: 'Ad Name', type: 'text' },
        { key: 'source', label: 'Channel', type: 'text' },
        { key: 'os', label: 'OS', type: 'text' },
        { key: 'cost', label: `Cost (${currency.toUpperCase()})`, type: 'number' },
        { key: 'impressions', label: 'Impressions', type: 'number' },
        { key: 'clicks', label: 'Clicks', type: 'number' },
        { key: 'installs', label: 'Installs', type: 'number' },
        { key: 'cpi', label: `CPI (${currency.toUpperCase()})`, type: 'number' },
        { key: 'ctr', label: 'CTR (%)', type: 'number' },
        { key: 'cti', label: 'CTI (%)', type: 'number' },
        { key: 'cpm', label: `CPM (${currency.toUpperCase()})`, type: 'number' },
    ], [currency]);

    // Processing logic (Add STT)
    const processedData = useMemo(() => {
        if (!topData || topData.length === 0) return [];
        return topData.map((row, index) => ({
            ...row,
            stt: index + 1
        }));
    }, [topData]);

    // Pagination
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedData.slice(startIndex, startIndex + itemsPerPage);
    }, [processedData, currentPage]);

    // Summary row (Total of all records, not just current page)
    const summary = useMemo(() => {
        if (!topData || topData.length === 0) return null;
        const totalClicks = topData.reduce((s, r) => s + (r.clicks || 0), 0);
        const totalImpressions = topData.reduce((s, r) => s + (r.impressions || 0), 0);
        const totalInstalls = topData.reduce((s, r) => s + (r.installs || 0), 0);
        const totalCost = topData.reduce((s, r) => s + (r.cost || 0), 0);
        return {
            stt: '',
            campaign_name: 'Tổng',
            source: '',
            os: '',
            clicks: totalClicks,
            impressions: totalImpressions,
            installs: totalInstalls,
            cost: totalCost,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            cti: totalClicks > 0 ? (totalInstalls / totalClicks) * 100 : 0,
            cpi: totalInstalls > 0 ? totalCost / totalInstalls : 0,
            cpm: totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0,
        };
    }, [topData]);

    const handleSort = useCallback((colKey) => {
        if (colKey === 'stt') return; // Do not sort by STT

        let newDir = 'asc';
        if (sortCol === colKey) {
            newDir = sortDir === 'asc' ? 'desc' : 'asc';
        }
        if (onSortChange) {
            onSortChange(colKey, newDir);
        }
        setCurrentPage(1); // Reset to page 1 on sort
    }, [sortCol, sortDir, onSortChange]);

    const handlePageChange = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, [totalPages]);

    const formatValue = useCallback((key, value) => {
        if (value === null || value === undefined) return '—';
        if (value === '') return '';
        switch (key) {
            case 'campaign_name':
            case 'source':
            case 'os':
                return value;
            case 'stt':
            case 'clicks':
            case 'impressions':
            case 'installs':
                return new Intl.NumberFormat('vi-VN').format(value);
            case 'cost':
                return currency === 'usd'
                    ? '$' + new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
                    : new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
            case 'ctr':
            case 'cti':
                return value.toFixed(2) + '%';
            case 'cpi':
            case 'cpm':
                return currency === 'usd'
                    ? '$' + new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value)
                    : new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
            default: return value;
        }
    }, [currency]);

    const isColVisible = useCallback((key) => {
        if (key === 'stt') return true; // always show STT
        return visibleColumns.includes(key);
    }, [visibleColumns]);

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        // Hiển thị tối đa 5 trang
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    className={`pagination-page ${i === currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="pagination">
                <button 
                    className="pagination-btn" 
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                >
                    &lt; Prev
                </button>
                {startPage > 1 && <span className="pagination-ellipsis">...</span>}
                {pages}
                {endPage < totalPages && <span className="pagination-ellipsis">...</span>}
                <button 
                    className="pagination-btn" 
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                >
                    Next &gt;
                </button>
            </div>
        );
    };

    return (
        <div className="table-wrapper">
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                isColVisible(col.key) && (
                                    <th
                                        key={col.key}
                                        className={`col-${col.key} col-${col.type} ${sortCol === col.key ? 'sorted' : ''}`}
                                        onClick={() => handleSort(col.key)}
                                        title={col.key === 'stt' ? '' : `Sắp xếp theo ${col.label}`}
                                        style={{ cursor: col.key === 'stt' ? 'default' : 'pointer' }}
                                    >
                                        {col.label}
                                        {col.key !== 'stt' && (
                                            <span className="sort-icon">
                                                {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
                                            </span>
                                        )}
                                    </th>
                                )
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, idx) => (
                                <tr key={`row-${idx}`} className="data-row">
                                    {columns.map(col => (
                                        isColVisible(col.key) && (
                                            <td key={col.key} className={`col-${col.key} col-${col.type}`}>
                                                {formatValue(col.key, row[col.key])}
                                            </td>
                                        )
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.filter(c => isColVisible(c.key)).length} style={{ textAlign: 'center', padding: '30px' }}>
                                    Không có dữ liệu
                                </td>
                            </tr>
                        )}

                        {/* Summary row */}
                        {summary && paginatedData.length > 0 && (
                            <tr className="summary-row">
                                {columns.map(col => (
                                    isColVisible(col.key) && (
                                        <td key={col.key} className={`col-${col.key} col-${col.type}`}>
                                            {formatValue(col.key, summary[col.key])}
                                        </td>
                                    )
                                ))}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {renderPagination()}
        </div>
    );
});

export default TopTable;
