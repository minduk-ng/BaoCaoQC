<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CompareController;

Route::get('/', function () {
    return redirect('/report');
});

Route::get('/report', [ReportController::class, 'index'])->name('report.index');
Route::get('/compare', [CompareController::class, 'index'])->name('compare.index');
Route::get('/api/compare-data', [CompareController::class, 'getData'])->name('compare.data');
