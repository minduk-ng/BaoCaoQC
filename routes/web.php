<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CompareController;
use App\Http\Controllers\TopCampaignController;
use App\Http\Controllers\Auth\GoogleAuthController;

/*
|--------------------------------------------------------------------------
| Public Routes (no auth required)
|--------------------------------------------------------------------------
*/
Route::get('/login', fn () => \Inertia\Inertia::render('Auth/Login', [
    'error' => session('error'),
]))->name('login');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirectToGoogle'])
    ->name('auth.google.redirect');

Route::get('/auth/google/callback', [GoogleAuthController::class, 'handleCallback'])
    ->name('auth.google.callback');

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['check.auth'])->group(function () {
    // Logout
    Route::post('/auth/logout', [GoogleAuthController::class, 'logout'])
        ->name('auth.logout');

    // Unauthorized page (guest role lands here)
    Route::get('/unauthorized', fn () => \Inertia\Inertia::render('Auth/Unauthorized'))
        ->name('unauthorized');

    // Routes for admin + viewer
    Route::middleware(['check.role:admin,viewer'])->group(function () {
        Route::get('/', fn () => redirect('/report'));
        Route::get('/report', [ReportController::class, 'index'])->name('report.index');
        Route::get('/top-campaign', [TopCampaignController::class, 'index'])->name('top.index');
    });

    // Routes for admin only
    Route::middleware(['check.role:admin'])->group(function () {
        Route::get('/compare', [CompareController::class, 'index'])->name('compare.index');
        Route::get('/api/compare-data', [CompareController::class, 'getData'])->name('compare.data');
    });
});
