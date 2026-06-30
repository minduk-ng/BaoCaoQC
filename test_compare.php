<?php
$req = \Illuminate\Http\Request::create('/api/compare-data', 'GET', [
    'customer_name' => '',
    'date_from' => '2026-05-19',
    'date_to' => '2026-06-18',
    'currency' => 'vnd',
    'sources' => ['FACEBOOK_ADS', 'GOOGLE_ADS', 'APPLE_SEARCH_ADS', 'TIKTOK_ADS'],
]);
$ctl = new \App\Http\Controllers\CompareController();
$response = $ctl->getData($req);
$data = json_decode($response->getContent(), true);
echo "Days count: " . count($data['days']) . "\n";
echo "Total clicks: " . $data['totals']['clicks'] . "\n";
echo "Total impressions: " . $data['totals']['impressions'] . "\n";
echo "First 3 days: " . implode(', ', array_slice($data['days'], 0, 3)) . "\n";
echo "First 3 click values: " . implode(', ', array_slice($data['metrics']['clicks'], 0, 3)) . "\n";
