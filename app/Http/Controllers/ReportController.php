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
        $dateFrom = $request->input('date_from', now()->subDay()->toDateString());
        $dateTo = $request->input('date_to', now()->subDay()->toDateString());
        $currency = $request->input('currency', 'vnd');
        $groupMode = $request->input('group_mode', 'source'); // 'source' or 'os'
        
        $selectedCustomer = $request->input('customer_name', '');
        $selectedSources = $request->input('sources', []);
        $selectedRegions = $request->input('regions', []);
        $selectedOs = $request->input('os_filter', []);
        $selectedFormats = $request->input('formats', []);
        $selectedTypes = $request->input('types', []);

        $hasMetrics = function($q) {
            $q->where('clicks', '>', 0)
              ->where('impressions', '>', 0)
              ->where('installs', '>', 0)
              ->where('cost_vnd', '>', 0);
        };

        // Fetch distinct values for filters
        $allSources = ads::whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('source')
            ->where('source', '!=', '')
            ->where($hasMetrics)
            ->distinct()->orderBy('source')->pluck('source');

        $allRegions = ads::whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('region')
            ->where('region', '!=', '')
            ->where($hasMetrics)
            ->distinct()->orderBy('region')->pluck('region');

        $allOs = ads::whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('os')
            ->where('os', '!=', '')
            ->where($hasMetrics)
            ->distinct()->orderBy('os')->pluck('os');

        $allFormats = ads::whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('fomat')
            ->where('fomat', '!=', '')
            ->where($hasMetrics)
            ->distinct()->orderBy('fomat')->pluck('fomat');

        $allTypes = ads::whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('type')
            ->where('type', '!=', '')
            ->where($hasMetrics)
            ->distinct()->orderBy('type')->pluck('type');

        $customerNames = ads::whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('customer_name')
            ->where($hasMetrics)
            ->distinct()->orderBy('customer_name')->pluck('customer_name');
        
        if ($selectedCustomer !== '' && !$customerNames->contains($selectedCustomer)) {
            $selectedCustomer = '';
        }

        // --- Xây dựng query (Group trực tiếp ở MySQL thông qua Eloquent) ---
        $costField = $currency === 'usd' ? 'cost_usd' : 'cost_vnd';
        $currencySymbol = $currency === 'usd' ? '$' : 'đ';

        $query = ads::whereBetween('date', [$dateFrom, $dateTo]);

        if ($selectedCustomer !== '') {
            $query->where('customer_name', $selectedCustomer);
        }
        if (!empty($selectedSources)) {
            $query->whereIn('source', $selectedSources);
        }
        if (!empty($selectedRegions)) {
            $query->whereIn('region', $selectedRegions);
        }
        if (!empty($selectedOs)) {
            $query->whereIn('os', $selectedOs);
        }
        if (!empty($selectedFormats)) {
            $query->whereIn('fomat', $selectedFormats);
        }
        if (!empty($selectedTypes)) {
            $query->whereIn('type', $selectedTypes);
        }

        if ($groupMode === 'source') {
            $spResults = (clone $query)->select([
                'source',
                'customer_name',
                DB::raw("SUM(clicks) as clicks"),
                DB::raw("SUM(impressions) as impressions"),
                DB::raw("SUM(installs) as installs"),
                DB::raw("SUM(cost_usd) as cost_usd"),
                DB::raw("SUM(cost_vnd) as cost_vnd")
            ])
            ->groupBy('source', 'customer_name')
            ->get();
        } else {
            $spResults = (clone $query)->select([
                'os',
                'source',
                'fomat',
                'type',
                DB::raw("SUM(clicks) as clicks"),
                DB::raw("SUM(impressions) as impressions"),
                DB::raw("SUM(installs) as installs"),
                DB::raw("SUM(cost_usd) as cost_usd"),
                DB::raw("SUM(cost_vnd) as cost_vnd")
            ])
            ->groupBy('os', 'source', 'fomat', 'type')
            ->get();
        }

        // Helper function tính metrics
        $calcMetrics = function ($clicks, $impressions, $installs, $cost) {
            return [
                'ctr' => $impressions > 0 ? ($clicks / $impressions) * 100 : 0,
                'cti' => $clicks > 0 ? ($installs / $clicks) * 100 : 0,
                'cpi' => $installs > 0 ? ($cost / $installs) : 0,
                'cpm' => $impressions > 0 ? ($cost / $impressions) * 1000 : 0,
            ];
        };

        if ($groupMode === 'source') {
            // Build Tree: Source → Customer
            $reportData = $spResults->groupBy('source')->map(function ($items, $source) use ($calcMetrics, $costField) {
                $clicks = $items->sum('clicks');
                $impressions = $items->sum('impressions');
                $installs = $items->sum('installs');
                $cost = $items->sum($costField);

                $children = $items->map(function ($item) use ($calcMetrics, $costField) {
                    $c = (int) $item->clicks;
                    $i = (int) $item->impressions;
                    $ins = (int) $item->installs;
                    $co = (float) $item->$costField;

                    return array_merge([
                        'customer_name' => $item->customer_name ?: '(không rõ)',
                        'clicks' => $c,
                        'impressions' => $i,
                        'installs' => $ins,
                        'cost' => $co,
                    ], $calcMetrics($c, $i, $ins, $co));
                })->filter()->sortBy('customer_name')->values()->all();

                return array_merge([
                    'source' => $source ?: 'Unknown',
                    'clicks' => $clicks,
                    'impressions' => $impressions,
                    'installs' => $installs,
                    'cost' => $cost,
                    'children' => $children,
                ], $calcMetrics($clicks, $impressions, $installs, $cost));
            })->filter()->sortBy('source')->values();

        } else {
            // Build Tree: OS → Source → Format → Type
            // Replace null/empty with Unknown
            $spResults = $spResults->map(function ($item) {
                $item->os = $item->os ?: 'Unknown';
                $item->source = $item->source ?: 'Unknown';
                $item->fomat = $item->fomat ?: 'Unknown';
                $item->type = $item->type ?: 'Unknown';
                return $item;
            });

            $reportData = $spResults->groupBy('os')->map(function ($osItems, $os) use ($calcMetrics, $costField) {
                $osClicks = $osItems->sum('clicks');
                $osImpressions = $osItems->sum('impressions');
                $osInstalls = $osItems->sum('installs');
                $osCost = $osItems->sum($costField);

                $osChildren = $osItems->groupBy('source')->map(function ($sourceItems, $source) use ($calcMetrics, $costField) {
                    $sClicks = $sourceItems->sum('clicks');
                    $sImpressions = $sourceItems->sum('impressions');
                    $sInstalls = $sourceItems->sum('installs');
                    $sCost = $sourceItems->sum($costField);

                    $sourceChildren = $sourceItems->groupBy('fomat')->map(function ($fomatItems, $fomat) use ($calcMetrics, $costField) {
                        $fClicks = $fomatItems->sum('clicks');
                        $fImpressions = $fomatItems->sum('impressions');
                        $fInstalls = $fomatItems->sum('installs');
                        $fCost = $fomatItems->sum($costField);

                        $fomatChildren = $fomatItems->map(function ($item) use ($calcMetrics, $costField) {
                            $c = (int) $item->clicks;
                            $i = (int) $item->impressions;
                            $ins = (int) $item->installs;
                            $co = (float) $item->$costField;
                            return array_merge([
                                'type' => 'type',
                                'label' => $item->type,
                                'clicks' => $c,
                                'impressions' => $i,
                                'installs' => $ins,
                                'cost' => $co,
                            ], $calcMetrics($c, $i, $ins, $co));
                        })->values()->all();

                        return array_merge([
                            'type' => 'fomat',
                            'label' => $fomat,
                            'clicks' => $fClicks,
                            'impressions' => $fImpressions,
                            'installs' => $fInstalls,
                            'cost' => $fCost,
                            'children' => $fomatChildren,
                        ], $calcMetrics($fClicks, $fImpressions, $fInstalls, $fCost));
                    })->values()->all();

                    return array_merge([
                        'type' => 'source',
                        'label' => $source,
                        'clicks' => $sClicks,
                        'impressions' => $sImpressions,
                        'installs' => $sInstalls,
                        'cost' => $sCost,
                        'children' => $sourceChildren,
                    ], $calcMetrics($sClicks, $sImpressions, $sInstalls, $sCost));
                })->values()->all();

                return array_merge([
                    'os' => $os,
                    'clicks' => $osClicks,
                    'impressions' => $osImpressions,
                    'installs' => $osInstalls,
                    'cost' => $osCost,
                    'children' => $osChildren,
                ], $calcMetrics($osClicks, $osImpressions, $osInstalls, $osCost));
            })->values();
        }

        // --- Tính tổng từ kết quả SP ---
        $totalClicks = (int) $spResults->sum('clicks');
        $totalImpressions = (int) $spResults->sum('impressions');
        $totalInstalls = (int) $spResults->sum('installs');
        $totalCost = (float) $spResults->sum($costField);

        $summary = array_merge([
            'clicks' => $totalClicks,
            'impressions' => $totalImpressions,
            'installs' => $totalInstalls,
            'cost' => $totalCost,
        ], $calcMetrics($totalClicks, $totalImpressions, $totalInstalls, $totalCost));

        return Inertia::render('Report/Index', [
            'reportData' => $reportData,
            'summary' => $summary,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'currency' => $currency,
            'currencySymbol' => $currencySymbol,
            'groupMode' => $groupMode,
            
            'customerNames' => $customerNames,
            'selectedCustomer' => $selectedCustomer,
            
            'allSources' => $allSources,
            'selectedSources' => $selectedSources,
            
            'allRegions' => $allRegions,
            'selectedRegions' => $selectedRegions,
            
            'allOs' => $allOs,
            'selectedOs' => $selectedOs,
            
            'allFormats' => $allFormats,
            'selectedFormats' => $selectedFormats,
            
            'allTypes' => $allTypes,
            'selectedTypes' => $selectedTypes,
        ]);
    }
}