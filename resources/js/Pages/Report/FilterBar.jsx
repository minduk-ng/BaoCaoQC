import React, { useCallback, memo } from 'react';
import Dropdown from '../../Components/UI/Dropdown';
import DateRangePicker from '../../Components/UI/DateRangePicker';

const FilterBar = memo(function FilterBar({
    customerNames,
    selectedCustomer,
    allSources,
    selectedSources,
    dateFrom,
    dateTo,
    currency,
    visibleColumns,
    onFilterChange,
    onColumnToggle,
}) {
    const handleCustomerChange = useCallback((e) => {
        onFilterChange({ customer_name: e.target.value });
    }, [onFilterChange]);

    const handleSourceToggle = useCallback((source, checked) => {
        const current = [...selectedSources];
        if (checked) {
            current.push(source);
        } else {
            const idx = current.indexOf(source);
            if (idx > -1) current.splice(idx, 1);
        }
        onFilterChange({ sources: current });
    }, [selectedSources, onFilterChange]);

    const handleDateChange = useCallback((from, to) => {
        onFilterChange({ date_from: from, date_to: to });
    }, [onFilterChange]);

    const handleCurrency = useCallback((cur) => {
        onFilterChange({ currency: cur });
    }, [onFilterChange]);

    const handleClear = useCallback(() => {
        onFilterChange({ customer_name: '', sources: [], date_from: '', date_to: '', currency: 'vnd' }, true);
    }, [onFilterChange]);

    const columns = [
        { key: 'source', label: 'Nguồn (Source)' },
        { key: 'clicks', label: 'Clicks' },
        { key: 'impressions', label: 'Impressions' },
        { key: 'installs', label: 'Installs' },
        { key: 'cost', label: 'Cost' },
        { key: 'ctr', label: 'CTR' },
        { key: 'cti', label: 'CTI' },
        { key: 'cpi', label: 'CPI' },
        { key: 'cpm', label: 'CPM' },
    ];

    return (
        <div className="filter-bar">
            {/* Customer */}
            <div className="filter-group">
                <span className="filter-label">Customer</span>
                <select
                    className="filter-select"
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                >
                    <option value="">Tất cả</option>
                    {customerNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            <div className="filter-sep"></div>

            {/* Source */}
            <Dropdown
                buttonLabel="Lọc Source"
                badge={selectedSources.length}
                align="left"
                icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
                    </svg>
                }
            >
                {allSources.map(src => (
                    <label key={src}>
                        <input
                            type="checkbox"
                            checked={selectedSources.includes(src)}
                            onChange={(e) => handleSourceToggle(src, e.target.checked)}
                        />
                        {src}
                    </label>
                ))}
            </Dropdown>

            <div className="filter-sep"></div>

            {/* Date Range */}
            <div className="filter-group">
                <span className="filter-label">Ngày</span>
                <DateRangePicker
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onChange={handleDateChange}
                />
            </div>

            <div className="filter-sep"></div>

            {/* Currency */}
            <div className="filter-group">
                <span className="filter-label">Tiền tệ</span>
                <div className="currency-toggle">
                    <button
                        type="button"
                        className={`currency-btn ${currency === 'vnd' ? 'active' : ''}`}
                        onClick={() => handleCurrency('vnd')}
                    >VND</button>
                    <button
                        type="button"
                        className={`currency-btn ${currency === 'usd' ? 'active' : ''}`}
                        onClick={() => handleCurrency('usd')}
                    >USD</button>
                </div>
            </div>

            <div className="filter-sep"></div>

            {/* Column Visibility */}
            <Dropdown
                buttonLabel="Hiển thị cột"
                align="right"
                icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                }
            >
                {columns.map(col => (
                    <label key={col.key}>
                        <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.key)}
                            onChange={(e) => onColumnToggle(col.key, e.target.checked)}
                        />
                        {col.label}
                    </label>
                ))}
            </Dropdown>

            <div className="spacer"></div>

            {/* Clear */}
            <button type="button" className="btn-clear" onClick={handleClear}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" /><path d="M8 6V4h8v2" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Clear
            </button>
        </div>
    );
});

export default FilterBar;
