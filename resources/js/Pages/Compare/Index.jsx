import React, { useState, useCallback, useMemo } from 'react';
import MainLayout from '../../Layouts/MainLayout';
import ControlPanel from './ControlPanel';
import DatasetList from './DatasetList';
import AddDatasetModal from './AddDatasetModal';
import CompareChart from '../../Components/Chart/CompareChart';

const MAX_DATASETS = 5;
const DATASET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const METRIC_LABELS = {
    clicks: 'Clicks', impressions: 'Impressions', installs: 'Installs', cost: 'Cost',
    ctr: 'CTR (%)', cti: 'CTI (%)', cpi: 'CPI', cpm: 'CPM',
};

function numberFormat(num, decimals) {
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
}

export default function CompareIndex({ customerNames, allSources }) {
    const [datasets, setDatasets] = useState([]);
    const [currentMetric, setCurrentMetric] = useState('clicks');
    const [currentCurrency, setCurrentCurrency] = useState('vnd');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [nextId, setNextId] = useState(1);
    const [editingDataset, setEditingDataset] = useState(null);

    const handleEditDataset = useCallback((dataset) => {
        setEditingDataset(dataset);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingDataset(null);
    }, []);

    // Fetch data from API
    const fetchData = useCallback(async (ds, currency) => {
        const params = new URLSearchParams();
        params.append('customer_name', ds.customer);
        params.append('date_from', ds.dateFrom);
        params.append('date_to', ds.dateTo);
        params.append('currency', currency);
        ds.sources.forEach(s => params.append('sources[]', s));

        const response = await fetch(`/api/compare-data?${params.toString()}`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    }, []);

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

    // Remove dataset
    const handleRemoveDataset = useCallback((id) => {
        setDatasets(prev => prev.filter(ds => ds.id !== id));
    }, []);

    // Change currency => reload all datasets
    const handleCurrencyChange = useCallback(async (cur) => {
        setCurrentCurrency(cur);
        if (datasets.length === 0) return;

        setIsLoading(true);
        try {
            const promises = datasets.map(ds => fetchData(ds, cur));
            const results = await Promise.all(promises);
            setDatasets(prev => prev.map((ds, i) => ({ ...ds, data: results[i] })));
        } catch (err) {
            console.error('Reload error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [datasets, fetchData]);

    // Summary cards data
    const summaryCards = useMemo(() => {
        return datasets
            .filter(ds => ds.data)
            .map((ds, idx) => {
                const total = ds.data.totals[currentMetric];
                let formatted;
                if (['ctr', 'cti'].includes(currentMetric)) formatted = total.toFixed(2) + '%';
                else if (['cpi', 'cpm', 'cost'].includes(currentMetric)) {
                    formatted = currentCurrency === 'usd'
                        ? '$' + numberFormat(total, 2)
                        : numberFormat(total, 0) + ' đ';
                } else {
                    formatted = numberFormat(total, 0);
                }
                return { name: ds.name, value: formatted, idx };
            });
    }, [datasets, currentMetric, currentCurrency]);

    return (
        <MainLayout>
            <div className="compare-container">
                {/* LEFT PANEL */}
                <aside className="compare-panel">
                    <ControlPanel
                        currentMetric={currentMetric}
                        currentCurrency={currentCurrency}
                        onMetricChange={setCurrentMetric}
                        onCurrencyChange={handleCurrencyChange}
                    />

                    {/* Add dataset button */}
                    <button
                        type="button"
                        className="btn-add-dataset"
                        onClick={() => setIsModalOpen(true)}
                        disabled={datasets.length >= MAX_DATASETS}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Thêm bộ dữ liệu
                    </button>

                    {/* Dataset list */}
                    <div className="panel-section" style={{ padding: '12px' }}>
                        <div className="panel-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                            </svg>
                            Bộ dữ liệu ({datasets.length}/{MAX_DATASETS})
                        </div>
                        <DatasetList
                            datasets={datasets}
                            totalSources={allSources.length}
                            onRemove={handleRemoveDataset}
                            onEdit={handleEditDataset}
                        />
                    </div>
                </aside>

                {/* MAIN CHART AREA */}
                <section className="compare-main" >
                    <div className="chart-header">
                        <h1 className="chart-title">Tổng quát hiệu quả chiến dịch</h1>
                    </div>

                    {/* Summary cards */}
                    {summaryCards.length > 0 && (
                        <div className="summary-cards">
                            {summaryCards.map(card => (
                                <div key={card.idx} className={`summary-card sc-color-${card.idx % DATASET_COLORS.length}`}>
                                    <div className="summary-card-label">{card.name}</div>
                                    <div className="summary-card-value">{card.value}</div>
                                    <div className="summary-card-sub">{METRIC_LABELS[currentMetric]} tổng</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chart */}
                    <div className="chart-container">
                        {isLoading && (
                            <div className="chart-loading" style={{ display: 'flex' }}>
                                <div className="spinner"></div>
                            </div>
                        )}
                        <CompareChart
                            datasets={datasets}
                            currentMetric={currentMetric}
                            currentCurrency={currentCurrency}
                        />
                    </div>
                </section>
            </div>

            {/* Add Dataset Modal */}
            <AddDatasetModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveDataset}
                customerNames={customerNames}
                allSources={allSources}
                nextId={nextId}
                editingDataset={editingDataset}
            />
        </MainLayout>
    );
}
