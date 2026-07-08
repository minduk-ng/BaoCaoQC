# Customer Restriction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict viewer role data access by customer, allow viewers to access Top QC, and add Head titles to all pages.

**Architecture:** We update `config/auth_roles.php` to map emails to arrays of allowed customers. The `GoogleAuthController` stores this array in the session. `ReportController` and `TopCampaignController` read this session data and append a `whereIn` clause to the base Eloquent queries if the user doesn't have the `['*']` wildcard.

**Tech Stack:** Laravel 13, React 19, Inertia.js

## Global Constraints

- PHP ^8.3, Laravel ^13.8, React 19 + Inertia 3.
- Viewers must only see their explicitly allowed `customer_name`s.
- Admins must have the `['*']` wildcard for unrestricted access.

---

### Task 1: Update Role Configuration

**Files:**
- Modify: `config/auth_roles.php`

**Interfaces:**
- Produces: `config('auth_roles.roles')` with unified `email => ['customer']` structure.

- [ ] **Step 1: Update configuration structure**

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Role-Based Access Control
    |--------------------------------------------------------------------------
    |
    | Map Google email addresses to roles and their allowed customers.
    | '*' means full access to all customers.
    |
    */

    'roles' => [
        'admin' => [
            'minhducqwe0123@gmail.com' => ['*'],
        ],
        'viewer' => [
            'ngminhduc05.ds@gmail.com' => ['sg432'],
        ],
    ],
];
```

- [ ] **Step 2: Verify config parses correctly**

Run: `php artisan tinker --execute="echo json_encode(config('auth_roles.roles.viewer'));"`
Expected output: `{"ngminhduc05.ds@gmail.com":["sg432"]}`

- [ ] **Step 3: Commit**

```bash
git add config/auth_roles.php
git commit -m "feat(auth): restructure role config for customer restrictions"
```

---

### Task 2: Update Google Auth Controller

**Files:**
- Modify: `app/Http/Controllers/Auth/GoogleAuthController.php`

**Interfaces:**
- Consumes: `config('auth_roles.roles')`
- Produces: `Session::get('auth_user')` now contains `allowed_customers` array.

- [ ] **Step 1: Rewrite resolveRole and update handleCallback to store allowed_customers**

Modify `app/Http/Controllers/Auth/GoogleAuthController.php`:

```php
    public function handleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect('/login')->with('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        }

        $email = $googleUser->getEmail();
        $accessData = $this->resolveRoleAndCustomers($email);
        $role = $accessData['role'];
        $allowedCustomers = $accessData['allowed_customers'];

        Session::put('auth_user', [
            'name' => $googleUser->getName(),
            'email' => $email,
            'avatar' => $googleUser->getAvatar(),
            'role' => $role,
            'allowed_customers' => $allowedCustomers,
        ]);

        if ($role === 'guest') {
            return redirect('/unauthorized');
        }

        return redirect('/report');
    }

    /**
     * Look up the user's email in config/auth_roles.php to determine their role
     * and allowed customers.
     */
    private function resolveRoleAndCustomers(string $email): array
    {
        $roles = config('auth_roles.roles', []);

        foreach ($roles as $roleName => $users) {
            if (array_key_exists($email, $users)) {
                return [
                    'role' => $roleName,
                    'allowed_customers' => $users[$email],
                ];
            }
        }

        return [
            'role' => 'guest',
            'allowed_customers' => [],
        ];
    }
```
*(Make sure to remove the old `resolveRole` method)*

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/Auth/GoogleAuthController.php
git commit -m "feat(auth): store allowed_customers in session"
```

---

### Task 3: Update Routes and Sidebar

**Files:**
- Modify: `routes/web.php`
- Modify: `resources/js/Components/Sidebar/Sidebar.jsx`

**Interfaces:**
- Consumes: User role from session
- Produces: Viewers can access `/top-campaign` route and see it in the sidebar.

- [ ] **Step 1: Update Route Middleware**

In `routes/web.php`, move the `/top-campaign` route to the `admin,viewer` group.

```php
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
```

- [ ] **Step 2: Update Sidebar menu items**

In `resources/js/Components/Sidebar/Sidebar.jsx`, update the `roles` array for `Top QC`:

```javascript
        {
            href: '/top-campaign',
            label: 'Top QC',
            roles: ['admin', 'viewer'], // <-- Added 'viewer'
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 21h8M12 17v4M7 4h10l2 7H5L7 4zM12 11l-3 4h6l-3-4z" />
                </svg>
            ),
        },
```

- [ ] **Step 3: Commit**

```bash
git add routes/web.php resources/js/Components/Sidebar/Sidebar.jsx
git commit -m "feat(ui): grant viewer access to Top QC"
```

---

### Task 4: Filter Data in ReportController

**Files:**
- Modify: `app/Http/Controllers/ReportController.php`

**Interfaces:**
- Consumes: `Session::get('auth_user')`

- [ ] **Step 1: Implement global data filter for ReportController**

In `app/Http/Controllers/ReportController.php`, read the allowed customers from session and apply the filter globally to both the base `$hasMetrics` closure and the `$query` builder. Add this right after parsing the request parameters (around line 26).

```php
        $authUser = $request->session()->get('auth_user');
        $allowedCustomers = $authUser['allowed_customers'] ?? [];
        $isRestricted = !in_array('*', $allowedCustomers);

        $hasMetrics = function($q) use ($isRestricted, $allowedCustomers) {
            $q->where('clicks', '>', 0)
              ->where('impressions', '>', 0)
              ->where('installs', '>', 0)
              ->where('cost_vnd', '>', 0);
            
            if ($isRestricted) {
                $q->whereIn('customer_name', $allowedCustomers);
            }
        };
```

Update the main `$query` (around line 78) to also respect the restriction:

```php
        $query = ads::whereBetween('date', [$dateFrom, $dateTo]);

        if ($isRestricted) {
            $query->whereIn('customer_name', $allowedCustomers);
        }

        if ($selectedCustomer !== '') {
            $query->where('customer_name', $selectedCustomer);
        }
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/ReportController.php
git commit -m "feat(report): apply customer restrictions to report queries"
```

---

### Task 5: Filter Data in TopCampaignController

**Files:**
- Modify: `app/Http/Controllers/TopCampaignController.php`

**Interfaces:**
- Consumes: `Session::get('auth_user')`

- [ ] **Step 1: Implement global data filter for TopCampaignController**

In `app/Http/Controllers/TopCampaignController.php`, add similar restriction logic around line 24.

```php
        $authUser = $request->session()->get('auth_user');
        $allowedCustomers = $authUser['allowed_customers'] ?? [];
        $isRestricted = !in_array('*', $allowedCustomers);

        // Get unique sources and customers within the date range
        $sourcesQuery = ads::select('source')
            ->distinct()
            ->whereBetween('date', [$dateFrom, $dateTo]);
            
        if ($isRestricted) {
            $sourcesQuery->whereIn('customer_name', $allowedCustomers);
        }
        $allSources = $sourcesQuery->orderBy('source')->pluck('source');

        $customersQuery = ads::select('customer_name')
            ->distinct()
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->whereNotNull('customer_name')
            ->where(function($q) {
                $q->where('clicks', '>', 0)
                  ->orWhere('impressions', '>', 0)
                  ->orWhere('installs', '>', 0)
                  ->orWhere('cost_usd', '>', 0)
                  ->orWhere('cost_vnd', '>', 0);
            });
            
        if ($isRestricted) {
            $customersQuery->whereIn('customer_name', $allowedCustomers);
        }
        $customerNames = $customersQuery->orderBy('customer_name')->pluck('customer_name');
```

Update the main `$query` (around line 54):

```php
        // --- Build query ---
        $query = ads::whereBetween('date', [$dateFrom, $dateTo]);

        if ($isRestricted) {
            $query->whereIn('customer_name', $allowedCustomers);
        }

        if ($selectedCustomer !== '') {
            $query->where('customer_name', $selectedCustomer);
        }
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/TopCampaignController.php
git commit -m "feat(topqc): apply customer restrictions to top campaign queries"
```

---

### Task 6: Add Page Titles (Inertia Head)

**Files:**
- Modify: `resources/js/Pages/Auth/Login.jsx`
- Modify: `resources/js/Pages/Auth/Unauthorized.jsx`
- Modify: `resources/js/Pages/Report/Index.jsx`
- Modify: `resources/js/Pages/TopCampaign/Index.jsx`
- Modify: `resources/js/Pages/Compare/Index.jsx`

**Interfaces:**
- Consumes: `@inertiajs/react` `Head` component

- [ ] **Step 1: Add `<Head title="Đăng nhập - BaoCaoQC" />` to Login.jsx**

```javascript
import { Head } from '@inertiajs/react';

// Inside component render return:
    return (
        <div className="login-page">
            <Head title="Đăng nhập - BaoCaoQC" />
            ...
```

- [ ] **Step 2: Add `<Head title="Không có quyền - BaoCaoQC" />` to Unauthorized.jsx**

```javascript
import { Head } from '@inertiajs/react';

// Inside component render return:
    return (
        <div className="unauthorized-page">
            <Head title="Không có quyền - BaoCaoQC" />
            ...
```

- [ ] **Step 3: Add `<Head title="Báo cáo - BaoCaoQC" />` to Report/Index.jsx**

```javascript
import { Head } from '@inertiajs/react';

// Inside component render return (at the top of the fragment/div):
    return (
        <div className="dashboard-container">
            <Head title="Báo cáo - BaoCaoQC" />
            ...
```

- [ ] **Step 4: Add `<Head title="Top QC - BaoCaoQC" />` to TopCampaign/Index.jsx**

```javascript
import { Head } from '@inertiajs/react';

// Inside component render return:
    return (
        <div className="dashboard-container">
            <Head title="Top QC - BaoCaoQC" />
            ...
```

- [ ] **Step 5: Add `<Head title="So sánh - BaoCaoQC" />` to Compare/Index.jsx**

```javascript
import { Head } from '@inertiajs/react';

// Inside component render return:
    return (
        <div className="dashboard-container">
            <Head title="So sánh - BaoCaoQC" />
            ...
```

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Auth/Login.jsx resources/js/Pages/Auth/Unauthorized.jsx resources/js/Pages/Report/Index.jsx resources/js/Pages/TopCampaign/Index.jsx resources/js/Pages/Compare/Index.jsx
git commit -m "feat(ui): add Head titles to all pages"
```
