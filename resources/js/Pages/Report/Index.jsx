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
    customerNames,
    selectedCustomer,
    allSources,
    selectedSources,
    recordCount,
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
            customer_name: selectedCustomer,
            sources: selectedSources,
            date_from: dateFrom,
            date_to: dateTo,
            currency: currency,
        };

        const merged = { ...currentParams, ...params };

        // Clean empty values
        if (!merged.customer_name) delete merged.customer_name;
        if (!merged.sources || merged.sources.length === 0) delete merged.sources;

        router.get('/report', merged, { preserveState: true, preserveScroll: true });
    }, [selectedCustomer, selectedSources, dateFrom, dateTo, currency]);

    const handleColumnToggle = useCallback((colKey, visible) => {
        setVisibleColumns(prev => {
            if (visible) return [...prev, colKey];
            return prev.filter(c => c !== colKey);
        });
    }, []);

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
                customerNames={customerNames}
                selectedCustomer={selectedCustomer}
                allSources={allSources}
                selectedSources={selectedSources}
                dateFrom={dateFrom}
                dateTo={dateTo}
                currency={currency}
                visibleColumns={visibleColumns}
                onFilterChange={handleFilterChange}
                onColumnToggle={handleColumnToggle}
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
