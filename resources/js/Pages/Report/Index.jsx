import React, { useState, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import MainLayout from '../../Layouts/MainLayout';
import FilterBar from './FilterBar';
import DataTable from './DataTable';
import StatCard from '../../Components/UI/StatCard';

const ALL_COLUMNS = ['source', 'clicks', 'impressions', 'installs', 'cost', 'ctr', 'cti', 'cpi', 'cpm'];

export default function ReportIndex({
    reportData,
    summary,
    dateFrom,
    dateTo,
    currency,
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
}) {
    const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS);

    // Format helpers for stat cards
    const formatCost = useMemo(() => {
        if (currency === 'usd') {
            return '$' + new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summary.cost);
        }
        return new Intl.NumberFormat('vi-VN').format(Math.round(summary.cost)) + ' đ';
    }, [summary.cost, currency]);

    // Handle filter changes via Inertia
    const handleFilterChange = useCallback((params, isReset = false) => {
        if (isReset) {
            router.get('/report', {}, { preserveState: true, preserveScroll: true });
            return;
        }

        const currentParams = {
            group_mode: groupMode,
            customer_name: selectedCustomer,
            sources: selectedSources,
            regions: selectedRegions,
            os_filter: selectedOs,
            formats: selectedFormats,
            types: selectedTypes,
            date_from: dateFrom,
            date_to: dateTo,
            currency: currency,
        };

        const merged = { ...currentParams, ...params };

        // Clean empty values
        if (!merged.customer_name) delete merged.customer_name;
        if (!merged.sources || merged.sources.length === 0) delete merged.sources;
        if (!merged.regions || merged.regions.length === 0) delete merged.regions;
        if (!merged.os_filter || merged.os_filter.length === 0) delete merged.os_filter;
        if (!merged.formats || merged.formats.length === 0) delete merged.formats;
        if (!merged.types || merged.types.length === 0) delete merged.types;

        router.get('/report', merged, { preserveState: true, preserveScroll: true });
    }, [
        groupMode, selectedCustomer, selectedSources, selectedRegions,
        selectedOs, selectedFormats, selectedTypes, dateFrom, dateTo, currency
    ]);

    const handleColumnToggle = useCallback((colKey, visible) => {
        setVisibleColumns(prev => {
            if (visible) return [...prev, colKey];
            return prev.filter(c => c !== colKey);
        });
    }, []);

    // Calculate record count differently based on flat vs tree
    const recordCount = reportData ? reportData.length : 0;

    return (
        <MainLayout>
            {/* Header */}
            <div className="page-header" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div className="page-header-icon">📊</div>
                <div>
                    <h1>Báo cáo Chiến dịch Quảng cáo</h1>
                    <p>Phân tích hiệu quả theo nguồn dữ liệu</p>
                </div>
            </div>

            {/* Filter Bar */}
            <FilterBar
                groupMode={groupMode}
                customerNames={customerNames}
                selectedCustomer={selectedCustomer}
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
                dateFrom={dateFrom}
                dateTo={dateTo}
                currency={currency}
                visibleColumns={visibleColumns}
                onFilterChange={handleFilterChange}
                onColumnToggle={handleColumnToggle}
                reportData={reportData}
            />

            {/* Stat Cards */}
            <div className="stat-bar">
                <StatCard label="Tổng Clicks" value={new Intl.NumberFormat('vi-VN').format(summary.clicks)} />
                <StatCard label="Tổng Impressions" value={new Intl.NumberFormat('vi-VN').format(summary.impressions)} />
                <StatCard label="Tổng Installs" value={new Intl.NumberFormat('vi-VN').format(summary.installs)} />
                <StatCard label="Tổng Chi phí" value={formatCost} />
            </div>

            {/* Data Table */}
            <DataTable
                reportData={reportData}
                currency={currency}
                visibleColumns={visibleColumns}
                groupMode={groupMode}
            />

            {/* Record count */}
            <div className="record-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
                {recordCount} bản ghi
            </div>
        </MainLayout>
    );
}
