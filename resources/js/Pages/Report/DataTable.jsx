import React, { useState, useMemo, useCallback, memo } from 'react';

const DataTable = memo(function DataTable({ reportData, currency, visibleColumns, groupMode }) {
    const [sortCol, setSortCol] = useState('source');
    const [sortDir, setSortDir] = useState('asc');
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    const columns = useMemo(() => {
        const base = [
            { key: 'clicks', label: 'Clicks', type: 'number' },
            { key: 'impressions', label: 'Impressions', type: 'number' },
            { key: 'installs', label: 'Installs', type: 'number' },
            { key: 'cost', label: `Cost (${currency.toUpperCase()})`, type: 'number' },
            { key: 'ctr', label: 'CTR (%)', type: 'number' },
            { key: 'cti', label: 'CTI (%)', type: 'number' },
            { key: 'cpi', label: `CPI (${currency.toUpperCase()})`, type: 'number' },
            { key: 'cpm', label: `CPM (${currency.toUpperCase()})`, type: 'number' },
        ];
        
        if (groupMode === 'source') {
            return [{ key: 'source', label: 'Nhóm (Source)', type: 'text' }, ...base];
        } else {
            return [{ key: 'os', label: 'Nhóm (OS)', type: 'text' }, ...base];
        }
    }, [currency, groupMode]);

    // Sorting logic 
    const sortTree = useCallback((nodes) => {
        if (!nodes) return null;
        
        const sorted = [...nodes].sort((a, b) => {
            const key = (sortCol === 'source' || sortCol === 'os') ? (groupMode === 'source' ? 'source' : 'os') : sortCol;
            
            const aVal = a[key] || a.label || '';
            const bVal = b[key] || b.label || '';
            let cmp;
            
            if (typeof aVal === 'string') {
                cmp = String(aVal).localeCompare(String(bVal));
            } else {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return sorted.map(node => {
            if (node.children) {
                return { ...node, children: sortTree(node.children) };
            }
            return node;
        });
    }, [sortCol, sortDir, groupMode]);

    const sortedTreeData = useMemo(() => sortTree(reportData), [reportData, sortTree]);

    // Summary row
    const summary = useMemo(() => {
        if (!reportData || reportData.length === 0) return null;
        const totalClicks = reportData.reduce((s, r) => s + (r.clicks || 0), 0);
        const totalImpressions = reportData.reduce((s, r) => s + (r.impressions || 0), 0);
        const totalInstalls = reportData.reduce((s, r) => s + (r.installs || 0), 0);
        const totalCost = reportData.reduce((s, r) => s + (r.cost || 0), 0);
        
        const firstColKey = groupMode === 'source' ? 'source' : 'os';
        
        return {
            [firstColKey]: 'Tổng',
            clicks: totalClicks,
            impressions: totalImpressions,
            installs: totalInstalls,
            cost: totalCost,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            cti: totalClicks > 0 ? (totalInstalls / totalClicks) * 100 : 0,
            cpi: totalInstalls > 0 ? totalCost / totalInstalls : 0,
            cpm: totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0,
        };
    }, [reportData, groupMode]);

    const handleSort = useCallback((colKey) => {
        setSortCol(prev => {
            if (prev === colKey) {
                setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                return prev;
            }
            setSortDir('asc');
            return colKey;
        });
    }, []);

    const toggleExpand = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    }, []);

    const formatValue = useCallback((key, value) => {
        if (value === null || value === undefined) return '—';
        if (key === 'source' || key === 'os' || key === 'label') return value;
        
        switch (key) {
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

    const isColVisible = useCallback((key) => { if (key === "source" || key === "os") return true; return visibleColumns.includes(key); }, [visibleColumns]);

    // Render tree recursively
    const renderNode = (node, level, parentId) => {
        const nodeId = parentId ? `${parentId}-${node.source || node.os || node.label || node.customer_name}` : (node.source || node.os);
        const isExpanded = expandedNodes.has(nodeId);
        const hasChildren = node.children && node.children.length > 0;
        
        const isLevel1 = level === 1;
        const rowClass = isLevel1 ? `data-row source-row ${isExpanded ? 'expanded' : ''}` : 'child-row';
        const displayStyle = !isLevel1 ? { display: 'table-row' } : {};
        
        const labelText = node.source || node.os || node.customer_name || node.label;
        
        return (
            <React.Fragment key={nodeId}>
                <tr className={rowClass} style={displayStyle} onClick={() => hasChildren && toggleExpand(nodeId)}>
                    {columns.map(col => {
                        if (!isColVisible(col.key)) return null;
                        
                        if (col.key === 'source' || col.key === 'os') {
                            return (
                                <td key={col.key} className={`col-${col.key} col-${col.type}`} style={{ paddingLeft: isLevel1 ? '' : `${(level) * 20}px` }}>
                                    {hasChildren ? (
                                        <>
                                            <span className="expand-icon">▶</span>
                                            <span style={{ fontWeight: 600 }}>{labelText}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="child-indicator" style={{ display: "inline-block" }}></span>
                                            {labelText}
                                        </>
                                    )}
                                </td>
                            );
                        }
                        
                        return (
                            <td key={col.key} className={`col-${col.key} col-${col.type}`}>
                                {formatValue(col.key, node[col.key])}
                            </td>
                        );
                    })}
                </tr>
                {isExpanded && hasChildren && node.children.map((child, idx) => renderNode(child, level + 1, `${nodeId}-${idx}`))}
            </React.Fragment>
        );
    };

    return (
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
                                    title={`Sắp xếp theo ${col.label}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {col.label}
                                    <span className="sort-icon">
                                        {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}
                                    </span>
                                </th>
                            )
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedTreeData && sortedTreeData.map((node, idx) => renderNode(node, 1, `root-${idx}`))}

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


