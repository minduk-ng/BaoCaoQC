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
        $dateFrom = $request->input('date_from', now()->subDays(6)->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $currency = $request->input('currency', 'vnd');
        $selectedCustomer = $request->input('customer_name', '');
        $selectedSources = $request->input('sources', []);
        $topLimit = (int) $request->input('top_limit', 10);

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

        $rawData = $query->get();
        $costField = $currency === 'usd' ? 'cost_usd' : 'cost_vnd';
        $currencySymbol = $currency === 'usd' ? '$' : 'đ';

        // --- Group by campaign_name ---
        $topData = $rawData->groupBy('campaign_name')->map(function ($items, $campaignName) use ($costField) {
            $clicks = $items->sum('clicks');
            $impressions = $items->sum('impressions');
            $installs = $items->sum('installs');
            $cost = $items->sum($costField);
            
            if ($clicks <= 0 && $impressions <= 0 && $installs <= 0 && $cost <= 0) {
                return null;
            }

            // Get source and os (take the first one if multiple exist, or aggregate)
            $source = $items->pluck('source')->filter()->unique()->implode(', ');
            $os = $items->pluck('os')->filter()->unique()->implode(', ');

            return [
                'campaign_name' => $campaignName ?: '(không rõ)',
                'source' => $source ?: '(không rõ)',
                'os' => $os ?: '—',
                'clicks' => $clicks,
                'impressions' => $impressions,
                'installs' => $installs,
                'cost' => $cost,
                'ctr' => $impressions > 0 ? ($clicks / $impressions) * 100 : 0,
                'cti' => $clicks > 0 ? ($installs / $clicks) * 100 : 0,
                'cpi' => $installs > 0 ? ($cost / $installs) : 0,
                'cpm' => $impressions > 0 ? ($cost / $impressions) * 1000 : 0,
            ];
        })->filter()->sortByDesc('cost')->take($topLimit)->values();

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
        ]);
    }
}
