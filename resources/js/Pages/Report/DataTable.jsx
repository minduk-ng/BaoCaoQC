import React, { useState, useMemo, useCallback, memo } from 'react';

const DataTable = memo(function DataTable({ reportData, currency, visibleColumns }) {
    const [sortCol, setSortCol] = useState(0);
    const [sortDir, setSortDir] = useState('asc');
    const [expandedSources, setExpandedSources] = useState(new Set());

    const columns = useMemo(() => [
        { key: 'source', label: 'Nhóm (Source)', type: 'string' },
        { key: 'clicks', label: 'Clicks', type: 'number' },
        { key: 'impressions', label: 'Impressions', type: 'number' },
        { key: 'installs', label: 'Installs', type: 'number' },
        { key: 'cost', label: `Cost (${currency.toUpperCase()})`, type: 'number' },
        { key: 'ctr', label: 'CTR (%)', type: 'number' },
        { key: 'cti', label: 'CTI (%)', type: 'number' },
        { key: 'cpi', label: `CPI (${currency.toUpperCase()})`, type: 'number' },
        { key: 'cpm', label: `CPM (${currency.toUpperCase()})`, type: 'number' },
    ], [currency]);

    // Sorting logic with useMemo
    const sortedData = useMemo(() => {
        if (!reportData || reportData.length === 0) return [];
        const col = columns[sortCol];
        const sorted = [...reportData].sort((a, b) => {
            const aVal = a[col.key];
            const bVal = b[col.key];
            let cmp;
            if (col.type === 'string') {
                cmp = String(aVal).localeCompare(String(bVal));
            } else {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [reportData, sortCol, sortDir, columns]);

    // Summary row
    const summary = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const totalClicks = reportData.reduce((s, r) => s + (r.clicks || 0), 0);
        const totalImpressions = reportData.reduce((s, r) => s + (r.impressions || 0), 0);
        const totalInstalls = reportData.reduce((s, r) => s + (r.installs || 0), 0);
        const totalCost = reportData.reduce((s, r) => s + (r.cost || 0), 0);
        return {
            source: 'Tổng',
            clicks: totalClicks,
            impressions: totalImpressions,
            installs: totalInstalls,
            cost: totalCost,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            cti: totalClicks > 0 ? (totalInstalls / totalClicks) * 100 : 0,
            cpi: totalInstalls > 0 ? totalCost / totalInstalls : 0,
            cpm: totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0,
        };
    }, [reportData]);

    const handleSort = useCallback((colIndex) => {
        setSortCol(prev => {
            if (prev === colIndex) {
                setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                return prev;
            }
            setSortDir('asc');
            return colIndex;
        });
    }, []);

    const toggleExpand = useCallback((sourceId) => {
        setExpandedSources(prev => {
            const next = new Set(prev);
            if (next.has(sourceId)) next.delete(sourceId);
            else next.add(sourceId);
            return next;
        });
    }, []);

    const formatValue = useCallback((key, value) => {
        if (value === null || value === undefined) return '—';
        switch (key) {
            case 'source': return value;
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

    const isColVisible = useCallback((key) => visibleColumns.includes(key), [visibleColumns]);

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            isColVisible(col.key) && (
                                <th
                                    key={col.key}
                                    className={`col-${col.key} ${sortCol === idx ? 'sorted' : ''}`}
                                    onClick={() => handleSort(idx)}
                                    title={`Sắp xếp theo ${col.label}`}
                                >
                                    {col.label}
                                    <span className="sort-icon">
                                        {sortCol === idx ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
                                    </span>
                                </th>
                            )
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, idx) => {
                        const sourceId = `source-${idx}`;
                        const isExpanded = expandedSources.has(sourceId);
                        return (
                            <React.Fragment key={sourceId}>
                                {/* Source parent row */}
                                <tr
                                    className={`data-row source-row ${isExpanded ? 'expanded' : ''}`}
                                    onClick={() => toggleExpand(sourceId)}
                                >
                                    {columns.map(col => (
                                        isColVisible(col.key) && (
                                            <td key={col.key} className={`col-${col.key}`}>
                                                {col.key === 'source' ? (
                                                    <>
                                                        <span className="expand-icon">▶</span>
                                                        <span style={{ fontWeight: 600 }}>{row.source}</span>
                                                    </>
                                                ) : formatValue(col.key, row[col.key])}
                                            </td>
                                        )
                                    ))}
                                </tr>

                                {/* Child rows */}
                                {isExpanded && row.children && row.children.map((child, cIdx) => (
                                    <tr key={`${sourceId}-child-${cIdx}`} className="child-row" style={{ display: 'table-row' }}>
                                        {columns.map(col => (
                                            isColVisible(col.key) && (
                                                <td key={col.key} className={`col-${col.key}`}>
                                                    {col.key === 'source' ? (
                                                        <>
                                                            <span className="child-indicator"></span>
                                                            {child.customer_name}
                                                        </>
                                                    ) : formatValue(col.key, child[col.key])}
                                                </td>
                                            )
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}

                    {/* Summary row */}
                    {summary && (
                        <tr className="summary-row">
                            {columns.map(col => (
                                isColVisible(col.key) && (
                                    <td key={col.key} className={`col-${col.key}`}>
                                        {formatValue(col.key, summary[col.key])}
                                    </td>
                                )
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});

export default DataTable;
