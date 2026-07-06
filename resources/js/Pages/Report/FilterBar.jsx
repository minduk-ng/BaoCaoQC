import React, { useCallback, useState, memo } from 'react';
import Dropdown from '../../Components/UI/Dropdown';
import DateRangePicker from '../../Components/UI/DateRangePicker';
import { exportToExcel } from '../../utils/exportExcel';
import FilterModal from './FilterModal';

const FilterBar = memo(function FilterBar({
    groupMode,
    customerNames,
    selectedCustomer,
    allSources,
    selectedSources,
    allRegions,
    selectedRegions,
    allOs,
    selectedOs,
    allFormats,
    selectedFormats,
    allTypes,
    selectedTypes,
    dateFrom,
    dateTo,
    currency,
    visibleColumns,
    onFilterChange,
    onColumnToggle,
    reportData
}) {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    const handleCustomerChange = useCallback((e) => {
        onFilterChange({ customer_name: e.target.value });
    }, [onFilterChange]);

    const handleDateChange = useCallback((from, to) => {
        onFilterChange({ date_from: from, date_to: to });
    }, [onFilterChange]);

    const handleCurrency = useCallback((cur) => {
        onFilterChange({ currency: cur });
    }, [onFilterChange]);

    const handleGroupMode = useCallback((mode) => {
        onFilterChange({ group_mode: mode });
    }, [onFilterChange]);

    const handleClear = useCallback(() => {
        onFilterChange({
            customer_name: '',
            sources: [],
            regions: [],
            os_filter: [],
            formats: [],
            types: [],
            date_from: '',
            date_to: '',
            currency: 'vnd',
            group_mode: 'source'
        }, true);
    }, [onFilterChange]);

    const handleApplyFilters = useCallback((filters) => {
        onFilterChange(filters);
    }, [onFilterChange]);

    const handleExport = useCallback(() => {
        const customerPart = selectedCustomer || 'TatCa';
        const sourcePart = selectedSources.length > 0 ? 'Selected' : 'TatCa';
        const filename = `Report_${groupMode}_${customerPart}_${sourcePart}_${dateFrom}_to_${dateTo}.xlsx`;

        let exportCols = [];
        if (groupMode === 'source') {
            exportCols = [
                { key: 'source', label: 'Nguồn (Source)' },
                { key: 'clicks', label: 'Clicks' },
                { key: 'impressions', label: 'Impressions' },
                { key: 'installs', label: 'Installs' },
                { key: 'cost', label: `Cost (${currency.toUpperCase()})` },
                { key: 'ctr', label: 'CTR (%)' },
                { key: 'cti', label: 'CTI (%)' },
                { key: 'cpi', label: `CPI (${currency.toUpperCase()})` },
                { key: 'cpm', label: `CPM (${currency.toUpperCase()})` },
            ];
        } else {
            exportCols = [
                { key: 'os', label: 'Hệ điều hành (OS)' },
                { key: 'source', label: 'Nguồn (Source)' },
                { key: 'fomat', label: 'Định dạng (Format)' },
                { key: 'type', label: 'Loại (Type)' },
                { key: 'clicks', label: 'Clicks' },
                { key: 'impressions', label: 'Impressions' },
                { key: 'installs', label: 'Installs' },
                { key: 'cost', label: `Cost (${currency.toUpperCase()})` },
                { key: 'ctr', label: 'CTR (%)' },
                { key: 'cti', label: 'CTI (%)' },
                { key: 'cpi', label: `CPI (${currency.toUpperCase()})` },
                { key: 'cpm', label: `CPM (${currency.toUpperCase()})` },
            ];
        }

        // For export, we just export the flat data we used to build the tree
        // In the interest of time and simplicity, we can flatten the tree back or use reportData directly if it's flat
        // Since we are building the tree in frontend, reportData passed here is flat

        exportToExcel(reportData, exportCols, filename);
    }, [reportData, groupMode, selectedCustomer, selectedSources, dateFrom, dateTo, currency]);

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

    const activeFilterCount = selectedSources.length + selectedRegions.length + selectedOs.length + selectedFormats.length + selectedTypes.length;

    return (
        <div className="filter-bar">
            {/* Filter Modal */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={handleApplyFilters}
                groupMode={groupMode}
                allSources={allSources}
                selectedSources={selectedSources}
                allRegions={allRegions}
                selectedRegions={selectedRegions}
                allOs={allOs}
                selectedOs={selectedOs}
                allFormats={allFormats}
                selectedFormats={selectedFormats}
                allTypes={allTypes}
                selectedTypes={selectedTypes}
                currency={currency}
            />

            <div className='filter-inputs'>
                {/* Group Mode */}
                <div className="filter-group">
                    <span className="filter-label">Nhóm theo</span>
                    <div className="currency-toggle">
                        <button
                            type="button"
                            className={`currency-btn ${groupMode === 'source' ? 'active' : ''}`}
                            onClick={() => handleGroupMode('source')}
                        >Source</button>
                        <button
                            type="button"
                            className={`currency-btn ${groupMode === 'os' ? 'active' : ''}`}
                            onClick={() => handleGroupMode('os')}
                        >OS</button>
                    </div>
                </div>

                <div className="filter-sep"></div>

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
                {/* Filter Button */}
                <div className="filter-group">
                    <button
                        className={`filter-btn-outline ${activeFilterCount > 0 ? 'active' : ''}`}
                        onClick={() => setIsFilterModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
                        </svg>
                        Lọc {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
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

                <div className="filter-sep"></div>

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

            <div className="filter-actions-right">
                <button type="button" className="btn-export" onClick={handleExport}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Xuất Excel
                </button>
            </div>
        </div>
    );
});

export default FilterBar;
