import React, { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import MainLayout from '../../Layouts/MainLayout';
import FilterBar from './FilterBar';
import TopTable from './TopTable';

const DEFAULT_COLUMNS = ['campaign_name', 'source', 'os', 'cost', 'impressions', 'clicks', 'installs', 'cpi'];

export default function TopIndex({
    topData,
    dateFrom,
    dateTo,
    currency,
    customerNames,
    selectedCustomer,
    allSources,
    selectedSources,
    topLimit,
}) {
    const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);

    // Handle filter changes via Inertia
    const handleFilterChange = useCallback((params, isReset = false) => {
        if (isReset) {
            router.get('/top-campaign', {}, { preserveState: true, preserveScroll: true });
            return;
        }

        const currentParams = {
            customer_name: selectedCustomer,
            sources: selectedSources,
            date_from: dateFrom,
            date_to: dateTo,
            currency: currency,
            top_limit: topLimit
        };

        const merged = { ...currentParams, ...params };

        // Clean empty values
        if (!merged.customer_name) delete merged.customer_name;
        if (!merged.sources || merged.sources.length === 0) delete merged.sources;

        router.get('/top-campaign', merged, { preserveState: true, preserveScroll: true });
    }, [selectedCustomer, selectedSources, dateFrom, dateTo, currency, topLimit]);

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
                <div className="page-header-icon">🏆</div>
                <div>
                    <h1>Top Chiến dịch Quảng cáo</h1>
                    <p>Xếp hạng hiệu quả chiến dịch</p>
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
                topLimit={topLimit}
                visibleColumns={visibleColumns}
                onFilterChange={handleFilterChange}
                onColumnToggle={handleColumnToggle}
                topData={topData}
            />

            {/* Data Table */}
            <TopTable
                topData={topData}
                currency={currency}
                visibleColumns={visibleColumns}
            />

            {/* Record count */}
            <div className="record-count">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
                {topData.length} bản ghi
            </div>
        </MainLayout>
    );
}
