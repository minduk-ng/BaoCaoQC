<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ads;
use Inertia\Inertia;

class CompareController extends Controller
{
    /**
     * Hiển thị trang so sánh
     */
    public function index()
    {
        // Lấy danh sách customer_name có dữ liệu
        $customerNames = ads::select('customer_name')
            ->distinct()
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

        // Lấy danh sách source
        $allSources = ads::select('source')
            ->distinct()
            ->orderBy('source')
            ->pluck('source');

        return Inertia::render('Compare/Index', compact('customerNames', 'allSources'));
    }

    /**
     * API trả dữ liệu theo ngày cho biểu đồ so sánh
     */
    public function getData(Request $request)
    {
        $customerName = $request->input('customer_name');
        $dateFrom = $request->input('date_from', now()->subDays(30)->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $sources = $request->input('sources', []);
        $currency = $request->input('currency', 'vnd');

        $costField = $currency === 'usd' ? 'cost_usd' : 'cost_vnd';

        // Build query
        $query = ads::whereBetween('date', [$dateFrom, $dateTo]);

        if (!empty($customerName)) {
            $query->where('customer_name', $customerName);
        }

        if (!empty($sources)) {
            $query->whereIn('source', $sources);
        }

        $rawData = $query->get();

        // Group by date
        $grouped = $rawData->groupBy('date');

        // Generate ALL days in the date range (including days with no data)
        $start = \Carbon\Carbon::parse($dateFrom);
        $end = \Carbon\Carbon::parse($dateTo);

        $days = [];
        $metrics = [
            'clicks' => [],
            'impressions' => [],
            'installs' => [],
            'cost' => [],
            'ctr' => [],
            'cti' => [],
            'cpi' => [],
            'cpm' => [],
        ];

        $totalClicks = 0;
        $totalImpressions = 0;
        $totalInstalls = 0;
        $totalCost = 0;

        $current = $start->copy();
        while ($current->lte($end)) {
            $dateStr = $current->toDateString();
            $days[] = $dateStr;

            $items = $grouped->get($dateStr);

            $clicks = $items ? $items->sum('clicks') : 0;
            $impressions = $items ? $items->sum('impressions') : 0;
            $installs = $items ? $items->sum('installs') : 0;
            $cost = $items ? $items->sum($costField) : 0;

            $metrics['clicks'][] = $clicks;
            $metrics['impressions'][] = $impressions;
            $metrics['installs'][] = $installs;
            $metrics['cost'][] = round($cost, 2);
            $metrics['ctr'][] = $impressions > 0 ? round(($clicks / $impressions) * 100, 4) : 0;
            $metrics['cti'][] = $clicks > 0 ? round(($installs / $clicks) * 100, 4) : 0;
            $metrics['cpi'][] = $installs > 0 ? round($cost / $installs, 4) : 0;
            $metrics['cpm'][] = $impressions > 0 ? round(($cost / $impressions) * 1000, 4) : 0;

            $totalClicks += $clicks;
            $totalImpressions += $impressions;
            $totalInstalls += $installs;
            $totalCost += $cost;

            $current->addDay();
        }

        // Count days that actually have data
        $daysWithData = $grouped->count();

        $totals = [
            'clicks' => $totalClicks,
            'impressions' => $totalImpressions,
            'installs' => $totalInstalls,
            'cost' => round($totalCost, 2),
            'ctr' => $totalImpressions > 0 ? round(($totalClicks / $totalImpressions) * 100, 4) : 0,
            'cti' => $totalClicks > 0 ? round(($totalInstalls / $totalClicks) * 100, 4) : 0,
            'cpi' => $totalInstalls > 0 ? round($totalCost / $totalInstalls, 4) : 0,
            'cpm' => $totalImpressions > 0 ? round(($totalCost / $totalImpressions) * 1000, 4) : 0,
        ];

        return response()->json([
            'days' => $days,
            'metrics' => $metrics,
            'totals' => $totals,
            'days_with_data' => $daysWithData,
        ]);
    }
}
