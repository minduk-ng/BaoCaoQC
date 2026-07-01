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
        $groupMode = $request->input('group_mode', 'source'); // 'source' or 'os'
        
        $selectedCustomer = $request->input('customer_name', '');
        $selectedSources = $request->input('sources', []);
        $selectedRegions = $request->input('regions', []);
        $selectedOs = $request->input('os_filter', []);
        $selectedFormats = $request->input('formats', []);
        $selectedTypes = $request->input('types', []);

        $hasMetrics = function($q) {
            $q->where('clicks', '>', 0)
              ->orWhere('impressions', '>', 0)
              ->orWhere('installs', '>', 0)
              ->orWhere('cost_usd', '>', 0)
              ->orWhere('cost_vnd', '>', 0);
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

        // --- Xây dựng query ---
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

        $costField = $currency === 'usd' ? 'cost_usd' : 'cost_vnd';
        $currencySymbol = $currency === 'usd' ? '$' : 'đ';

        if ($groupMode === 'source') {
            // Group by source, customer_name
            $groupedData = (clone $query)->select([
                'source',
                'customer_name',
                DB::raw("SUM(clicks) as clicks"),
                DB::raw("SUM(impressions) as impressions"),
                DB::raw("SUM(installs) as installs"),
                DB::raw("SUM($costField) as cost")
            ])
            ->groupBy('source', 'customer_name')
            ->havingRaw("SUM(clicks) > 0 OR SUM(impressions) > 0 OR SUM(installs) > 0 OR SUM($costField) > 0")
            ->get();

            // Build Tree in PHP
            $reportData = $groupedData->groupBy('source')->map(function ($items, $source) use ($costField) {
                $clicks = $items->sum('clicks');
                $impressions = $items->sum('impressions');
                $installs = $items->sum('installs');
                $cost = $items->sum('cost');

                $children = $items->map(function ($item) {
                    $c = (int) $item->clicks;
                    $i = (int) $item->impressions;
                    $ins = (int) $item->installs;
                    $co = (float) $item->cost;

                    return [
                        'customer_name' => $item->customer_name ?: '(không rõ)',
                        'clicks' => $c,
                        'impressions' => $i,
                        'installs' => $ins,
                        'cost' => $co,
                        'ctr' => $i > 0 ? ($c / $i) * 100 : 0,
                        'cti' => $c > 0 ? ($ins / $c) * 100 : 0,
                        'cpi' => $ins > 0 ? ($co / $ins) : 0,
                        'cpm' => $i > 0 ? ($co / $i) * 1000 : 0,
                    ];
                })->filter()->sortBy('customer_name')->values()->all();

                return [
                    'source' => $source ?: 'Unknown',
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

        } else {
            // Group by os, source, fomat, type
            $groupedData = (clone $query)->select([
                'os',
                'source',
                'fomat',
                'type',
                DB::raw("SUM(clicks) as clicks"),
                DB::raw("SUM(impressions) as impressions"),
                DB::raw("SUM(installs) as installs"),
                DB::raw("SUM($costField) as cost")
            ])
            ->groupBy('os', 'source', 'fomat', 'type')
            ->havingRaw("SUM(clicks) > 0 OR SUM(impressions) > 0 OR SUM(installs) > 0 OR SUM($costField) > 0")
            ->get();

            // Replace null/empty with Unknown
            $groupedData = $groupedData->map(function ($item) {
                $item->os = $item->os ?: 'Unknown';
                $item->source = $item->source ?: 'Unknown';
                $item->fomat = $item->fomat ?: 'Unknown';
                $item->type = $item->type ?: 'Unknown';
                return $item;
            });

            // Build Tree: OS -> Source -> Format -> Type
            $reportData = $groupedData->groupBy('os')->map(function ($osItems, $os) {
                $osClicks = $osItems->sum('clicks');
                $osImpressions = $osItems->sum('impressions');
                $osInstalls = $osItems->sum('installs');
                $osCost = $osItems->sum('cost');

                $osChildren = $osItems->groupBy('source')->map(function ($sourceItems, $source) {
                    $sClicks = $sourceItems->sum('clicks');
                    $sImpressions = $sourceItems->sum('impressions');
                    $sInstalls = $sourceItems->sum('installs');
                    $sCost = $sourceItems->sum('cost');

                    $sourceChildren = $sourceItems->groupBy('fomat')->map(function ($fomatItems, $fomat) {
                        $fClicks = $fomatItems->sum('clicks');
                        $fImpressions = $fomatItems->sum('impressions');
                        $fInstalls = $fomatItems->sum('installs');
                        $fCost = $fomatItems->sum('cost');

                        $fomatChildren = $fomatItems->map(function ($item) {
                            $c = (int) $item->clicks;
                            $i = (int) $item->impressions;
                            $ins = (int) $item->installs;
                            $co = (float) $item->cost;
                            return [
                                'type' => 'type', // Identifier
                                'label' => $item->type,
                                'clicks' => $c,
                                'impressions' => $i,
                                'installs' => $ins,
                                'cost' => $co,
                                'ctr' => $i > 0 ? ($c / $i) * 100 : 0,
                                'cti' => $c > 0 ? ($ins / $c) * 100 : 0,
                                'cpi' => $ins > 0 ? ($co / $ins) : 0,
                                'cpm' => $i > 0 ? ($co / $i) * 1000 : 0,
                            ];
                        })->values()->all();

                        return [
                            'type' => 'fomat',
                            'label' => $fomat,
                            'clicks' => $fClicks,
                            'impressions' => $fImpressions,
                            'installs' => $fInstalls,
                            'cost' => $fCost,
                            'ctr' => $fImpressions > 0 ? ($fClicks / $fImpressions) * 100 : 0,
                            'cti' => $fClicks > 0 ? ($fInstalls / $fClicks) * 100 : 0,
                            'cpi' => $fInstalls > 0 ? ($fCost / $fInstalls) : 0,
                            'cpm' => $fImpressions > 0 ? ($fCost / $fImpressions) * 1000 : 0,
                            'children' => $fomatChildren
                        ];
                    })->values()->all();

                    return [
                        'type' => 'source',
                        'label' => $source,
                        'clicks' => $sClicks,
                        'impressions' => $sImpressions,
                        'installs' => $sInstalls,
                        'cost' => $sCost,
                        'ctr' => $sImpressions > 0 ? ($sClicks / $sImpressions) * 100 : 0,
                        'cti' => $sClicks > 0 ? ($sInstalls / $sClicks) * 100 : 0,
                        'cpi' => $sInstalls > 0 ? ($sCost / $sInstalls) : 0,
                        'cpm' => $sImpressions > 0 ? ($sCost / $sImpressions) * 1000 : 0,
                        'children' => $sourceChildren
                    ];
                })->values()->all();

                return [
                    'os' => $os,
                    'clicks' => $osClicks,
                    'impressions' => $osImpressions,
                    'installs' => $osInstalls,
                    'cost' => $osCost,
                    'ctr' => $osImpressions > 0 ? ($osClicks / $osImpressions) * 100 : 0,
                    'cti' => $osClicks > 0 ? ($osInstalls / $osClicks) * 100 : 0,
                    'cpi' => $osInstalls > 0 ? ($osCost / $osInstalls) : 0,
                    'cpm' => $osImpressions > 0 ? ($osCost / $osImpressions) * 1000 : 0,
                    'children' => $osChildren
                ];
            })->values();
        }

        // --- Tính tổng ---
        $summaryQuery = (clone $query)->select([
            DB::raw("SUM(clicks) as clicks"),
            DB::raw("SUM(impressions) as impressions"),
            DB::raw("SUM(installs) as installs"),
            DB::raw("SUM($costField) as cost")
        ])->first();

        $totalClicks = (int) ($summaryQuery->clicks ?? 0);
        $totalImpressions = (int) ($summaryQuery->impressions ?? 0);
        $totalInstalls = (int) ($summaryQuery->installs ?? 0);
        $totalCost = (float) ($summaryQuery->cost ?? 0);

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