<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\ads;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        // --- Đọc các tham số filter từ query string ---
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $currency = $request->input('currency', 'vnd');
        $selectedCustomer = $request->input('customer_name', '');
        $selectedSources = $request->input('sources', []);

        $allSources = ads::select('source')
            ->distinct()
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->orderBy('source')
            ->pluck('source');

        $customerNames = ads::select('customer_name')
            ->distinct()
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('customer_name')
            ->where(function($q) {
                $q->where('clicks', '>', 0)
                  ->orWhere('impressions', '>', 0)
                  ->orWhere('installs', '>', 0)
                  ->orWhere('cost_usd', '>', 0)
                  ->orWhere('cost_vnd', '>', 0);
            })
            ->orderBy('customer_name')
            ->pluck('customer_name');
        
        if ($selectedCustomer !== '' && !$customerNames->contains($selectedCustomer)) {
            $selectedCustomer = '';
        }

        if (!empty($selectedSources)) {
            $selectedSources = collect($selectedSources)->intersect($allSources)->toArray();
        }

        // --- Xây dựng query ---
        $query = ads::whereBetween('date', [$dateFrom, $dateTo]);

        if ($selectedCustomer !== '') {
            $query->where('customer_name', $selectedCustomer);
        }

        if (!empty($selectedSources)) {
            $query->whereIn('source', $selectedSources);
        }

        $rawData = $query->get();
        $costField = $currency === 'usd' ? 'cost_usd' : 'cost_vnd';
        $currencySymbol = $currency === 'usd' ? '$' : 'đ';

        // --- Group by source, rồi bên trong mỗi source group by customer_name ---
        $reportData = $rawData->groupBy('source')->map(function ($items, $source) use ($costField) {
            $clicks = $items->sum('clicks');
            $impressions = $items->sum('impressions');
            $installs = $items->sum('installs');
            $cost = $items->sum($costField);
            if($clicks <= 0 && $impressions <= 0 && $installs <= 0 && $cost <= 0){
                return null;
            } 

            $children = $items->groupBy('customer_name')->map(function ($subItems, $customerName) use ($costField) {
                $subClicks = $subItems->sum('clicks');
                $subImpressions = $subItems->sum('impressions');
                $subInstalls = $subItems->sum('installs');
                $subCost = $subItems->sum($costField);
                if($subClicks <= 0 && $subImpressions <= 0 && $subInstalls <= 0 && $subCost <= 0){
                    return null;
                }

                return [
                    'customer_name' => $customerName ?: '(không rõ)',
                    'clicks' => $subClicks,
                    'impressions' => $subImpressions,
                    'installs' => $subInstalls,
                    'cost' => $subCost,
                    'ctr' => $subImpressions > 0 ? ($subClicks / $subImpressions) * 100 : 0,
                    'cti' => $subClicks > 0 ? ($subInstalls / $subClicks) * 100 : 0,
                    'cpi' => $subInstalls > 0 ? ($subCost / $subInstalls) : 0,
                    'cpm' => $subImpressions > 0 ? ($subCost / $subImpressions) * 1000 : 0,
                ];
            })->filter()->sortBy('customer_name')->values()->all();

            return [
                'source' => $source,
                'clicks' => $clicks,
                'impressions' => $impressions,
                'installs' => $installs,
                'cost' => $cost,
                'ctr' => $impressions > 0 ? ($clicks / $impressions) * 100 : 0,
                'cti' => $clicks > 0 ? ($installs / $clicks) * 100 : 0,
                'cpi' => $installs > 0 ? ($cost / $installs) : 0,
                'cpm' => $impressions > 0 ? ($cost / $impressions) * 1000 : 0,
                'children' => $children,
            ];
        })->filter()->sortBy('source')->values();

        // --- Tính tổng ---
        $totalClicks = $rawData->sum('clicks');
        $totalImpressions = $rawData->sum('impressions');
        $totalInstalls = $rawData->sum('installs');
        $totalCost = $rawData->sum($costField);

        $summary = [
            'clicks' => $totalClicks,
            'impressions' => $totalImpressions,
            'installs' => $totalInstalls,
            'cost' => $totalCost,
            'ctr' => $totalImpressions > 0 ? ($totalClicks / $totalImpressions) * 100 : 0,
            'cti' => $totalClicks > 0 ? ($totalInstalls / $totalClicks) * 100 : 0,
            'cpi' => $totalInstalls > 0 ? ($totalCost / $totalInstalls) : 0,
            'cpm' => $totalImpressions > 0 ? ($totalCost / $totalImpressions) * 1000 : 0,
        ];

        $recordCount = $reportData->count();

        return Inertia::render('Report/Index', [
            'reportData' => $reportData,
            'summary' => $summary,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'currency' => $currency,
            'currencySymbol' => $currencySymbol,
            'customerNames' => $customerNames,
            'selectedCustomer' => $selectedCustomer,
            'allSources' => $allSources,
            'selectedSources' => $selectedSources,
            'recordCount' => $recordCount,
        ]);
    }
}