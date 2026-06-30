import React, { useRef, useEffect, useMemo, memo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DATASET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#c084fcff'];

function pad(n) { return n < 10 ? '0' + n : n; }
function numberFormat(num, decimals) {
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
}
function formatShortNumber(num) {
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

const CompareChart = memo(function CompareChart({ datasets, currentMetric, currentCurrency }) {
    // Build unified date labels
    const { labels, unifiedDays, chartDatasets } = useMemo(() => {
        const dateSet = new Set();
        datasets.forEach(ds => {
            if (ds.data && ds.data.days) {
                ds.data.days.forEach(d => dateSet.add(d));
            }
        });
        const unified = Array.from(dateSet).sort();

        const lbls = unified.map(day => {
            const d = new Date(day + 'T00:00:00');
            return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
        });

        const cds = [];
        datasets.forEach((ds, idx) => {
            if (!ds.data) return;
            const color = DATASET_COLORS[idx % DATASET_COLORS.length];

            const dsDayMap = {};
            ds.data.days.forEach((day, i) => { dsDayMap[day] = i; });

            const values = unified.map(day => {
                const dayIdx = dsDayMap[day];
                if (dayIdx !== undefined && ds.data.metrics[currentMetric]) {
                    return ds.data.metrics[currentMetric][dayIdx] || 0;
                }
                return null;
            });

            cds.push({
                label: ds.name,
                data: values,
                borderColor: color,
                backgroundColor: color + '20',
                borderWidth: 2.5,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                tension: 0.3,
                fill: false,
                spanGaps: false,
            });
        });

        return { labels: lbls, unifiedDays: unified, chartDatasets: cds };
    }, [datasets, currentMetric]);

    const options = useMemo(() => {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const tickColor = isDark ? '#6b7280' : '#8891a5';

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: tickColor,
                        font: { family: 'Inter', size: 12, weight: '500' },
                        usePointStyle: true,
                        padding: 20,
                    },
                },
                tooltip: {
                    backgroundColor: isDark ? '#21242f' : '#fff',
                    titleColor: isDark ? '#e8eaed' : '#1a1d2e',
                    bodyColor: isDark ? '#9ca3af' : '#4b5068',
                    borderColor: isDark ? '#2d3142' : '#d8dae5',
                    borderWidth: 1,
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function (tooltipItems) {
                            const idx = tooltipItems[0].dataIndex;
                            if (unifiedDays[idx]) {
                                const d = new Date(unifiedDays[idx] + 'T00:00:00');
                                return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
                            }
                            return tooltipItems[0].label;
                        },
                        label: function (ctx) {
                            if (ctx.parsed.y === null) return null;
                            const value = ctx.parsed.y;
                            let formatted;
                            if (['ctr', 'cti'].includes(currentMetric)) formatted = value.toFixed(2) + '%';
                            else if (['cpi', 'cpm', 'cost'].includes(currentMetric)) {
                                formatted = currentCurrency === 'usd'
                                    ? '$' + numberFormat(value, 2)
                                    : numberFormat(value, 0) + ' đ';
                            } else {
                                formatted = numberFormat(value, 0);
                            }
                            return ctx.dataset.label + ': ' + formatted;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: {
                        color: tickColor,
                        font: { family: 'Inter', size: 11 },
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: tickColor,
                        font: { family: 'Inter', size: 11 },
                        callback: function (value) { return formatShortNumber(value); },
                    },
                    beginAtZero: true,
                },
            },
        };
    }, [unifiedDays, currentMetric, currentCurrency]);

    const hasData = datasets.length > 0 && datasets.some(ds => ds.data);

    if (!hasData) {
        return (
            <div className="chart-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
                <p>Thêm bộ dữ liệu để bắt đầu so sánh</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', height: '700px' }}>
            <Line data={{ labels, datasets: chartDatasets }} options={options} />
        </div>
    );
});

export default CompareChart;
