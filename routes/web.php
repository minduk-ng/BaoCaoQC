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
Route::middleware(['check.auth', 'check.page'])->group(function () {
    // Logout
    Route::post('/auth/logout', [GoogleAuthController::class, 'logout'])
        ->name('auth.logout')
        ->withoutMiddleware('check.page');

    // Unauthorized page
    Route::get('/unauthorized', fn () => \Inertia\Inertia::render('Auth/Unauthorized'))
        ->name('unauthorized')
        ->withoutMiddleware('check.page');

    Route::get('/', fn () => redirect('/report'))->withoutMiddleware('check.page');

    Route::get('/report', [ReportController::class, 'index'])->name('report.index');
    Route::get('/top-campaign', [TopCampaignController::class, 'index'])->name('top.index');

    Route::get('/compare', [CompareController::class, 'index'])->name('compare.index');
    Route::get('/api/compare-data', [CompareController::class, 'getData'])->name('compare.data');

    // Admin Panel Routes
    Route::get('/admin', [\App\Http\Controllers\AdminController::class, 'index'])->name('admin.index');
    Route::post('/admin/roles', [\App\Http\Controllers\AdminController::class, 'storeRole'])->name('admin.roles.store');
    Route::put('/admin/roles/{role}', [\App\Http\Controllers\AdminController::class, 'updateRole'])->name('admin.roles.update');
    Route::delete('/admin/roles/{role}', [\App\Http\Controllers\AdminController::class, 'destroyRole'])->name('admin.roles.destroy');
    Route::post('/admin/users', [\App\Http\Controllers\AdminController::class, 'assignRole'])->name('admin.users.assign');
    Route::delete('/admin/users/{id}', [\App\Http\Controllers\AdminController::class, 'removeRole'])->name('admin.users.remove');
    Route::delete('/admin/users/{id}/delete', [\App\Http\Controllers\AdminController::class, 'destroyUser'])->name('admin.users.destroy');
});
