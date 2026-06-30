import React, { useCallback, memo } from 'react';

const METRIC_OPTIONS = [
    { key: 'clicks', label: 'Clicks' },
    { key: 'impressions', label: 'Impress.' },
    { key: 'installs', label: 'Installs' },
    { key: 'cost', label: 'Cost' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cti', label: 'CTI' },
    { key: 'cpi', label: 'CPI' },
    { key: 'cpm', label: 'CPM' },
];

const ControlPanel = memo(function ControlPanel({
    currentMetric,
    currentCurrency,
    onMetricChange,
    onCurrencyChange,
}) {
    return (
        <>
            {/* Metric selector */}
            <div className="panel-section">
                <div className="panel-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                    Chỉ số hiển thị
                </div>
                <div className="metric-grid">
                    {METRIC_OPTIONS.map(opt => (
                        <div
                            key={opt.key}
                            className={`metric-label ${currentMetric === opt.key ? 'active' : ''}`}
                            onClick={() => onMetricChange(opt.key)}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Currency */}
            <div className="panel-section">
                <div className="panel-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                    Tiền tệ
                </div>
                <div className="panel-currency">
                    <button
                        type="button"
                        className={`panel-currency-btn ${currentCurrency === 'vnd' ? 'active' : ''}`}
                        onClick={() => onCurrencyChange('vnd')}
                    >VND</button>
                    <button
                        type="button"
                        className={`panel-currency-btn ${currentCurrency === 'usd' ? 'active' : ''}`}
                        onClick={() => onCurrencyChange('usd')}
                    >USD</button>
                </div>
            </div>
        </>
    );
});

export default ControlPanel;
