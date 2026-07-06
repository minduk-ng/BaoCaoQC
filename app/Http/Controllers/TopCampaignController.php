<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\ads;
use Inertia\Inertia;

class TopCampaignController extends Controller
{
    public function index(Request $request)
    {
        // --- Read filter parameters from query string ---
        $dateFrom = $request->input('date_from', now()->subDay()->toDateString());
        $dateTo = $request->input('date_to', now()->subDay()->toDateString());
        $currency = $request->input('currency', 'vnd');
        $selectedCustomer = $request->input('customer_name', '');
        $selectedSources = $request->input('sources', []);
        $topLimit = (int) $request->input('top_limit', 10);
        $sortCol = $request->input('sort_col', 'cost');
        $sortDir = $request->input('sort_dir', 'desc');

        // Get unique sources and customers within the date range
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

        // --- Build query ---
        $query = ads::whereBetween('date', [$dateFrom, $dateTo]);

        if ($selectedCustomer !== '') {
            $query->where('customer_name', $selectedCustomer);
        }

        if (!empty($selectedSources)) {
            $query->whereIn('source', $selectedSources);
        }

        $costField = $currency === 'usd' ? 'cost_usd' : 'cost_vnd';
        $currencySymbol = $currency === 'usd' ? '$' : 'đ';

        // --- Group by campaign_name in MySQL ---
        $groupedData = $query->select([
            'campaign_name',
            DB::raw("GROUP_CONCAT(DISTINCT source SEPARATOR ', ') as source"),
            DB::raw("GROUP_CONCAT(DISTINCT os SEPARATOR ', ') as os"),
            DB::raw("SUM(clicks) as clicks"),
            DB::raw("SUM(impressions) as impressions"),
            DB::raw("SUM(installs) as installs"),
            DB::raw("SUM($costField) as cost")
        ])
        ->groupBy('campaign_name')
        ->havingRaw("SUM(clicks) > 0 OR SUM(impressions) > 0 OR SUM(installs) > 0 OR SUM($costField) > 0")
        ->get();

        // --- Map calculated percentages in PHP ---
        $groupedData = $groupedData->map(function ($item) {
            $clicks = (int) $item->clicks;
            $impressions = (int) $item->impressions;
            $installs = (int) $item->installs;
            $cost = (float) $item->cost;

            return [
                'campaign_name' => $item->campaign_name ?: '(không rõ)',
                'source' => $item->source ?: '(không rõ)',
                'os' => $item->os ?: '—',
                'clicks' => $clicks,
                'impressions' => $impressions,
                'installs' => $installs,
                'cost' => $cost,
                'ctr' => $impressions > 0 ? ($clicks / $impressions) * 100 : 0,
                'cti' => $clicks > 0 ? ($installs / $clicks) * 100 : 0,
                'cpi' => $installs > 0 ? ($cost / $installs) : 0,
                'cpm' => $impressions > 0 ? ($cost / $impressions) * 1000 : 0,
            ];
        });

        // --- Sort and Take Top Limit ---
        $topData = $groupedData->sortBy($sortCol, SORT_REGULAR, $sortDir === 'desc')->take($topLimit)->values();

        return Inertia::render('TopCampaign/Index', [
            'topData' => $topData,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'currency' => $currency,
            'currencySymbol' => $currencySymbol,
            'customerNames' => $customerNames,
            'selectedCustomer' => $selectedCustomer,
            'allSources' => $allSources,
            'selectedSources' => $selectedSources,
            'topLimit' => $topLimit,
            'sortCol' => $sortCol,
            'sortDir' => $sortDir,
        ]);
    }
}
