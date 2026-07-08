# Google Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login with session-based role authorization to the BaoCaoQC dashboard.

**Architecture:** Laravel Socialite handles OAuth on backend → user info stored in session → shared to React via Inertia shared data → middleware protects routes by role → Sidebar shows/hides menu items based on role.

**Tech Stack:** Laravel 13, Laravel Socialite, Inertia.js, React 19, CSS Variables (existing design system)

## Global Constraints

- PHP ^8.3, Laravel ^13.8
- Frontend: React 19 + Inertia.js 3 + Vite 8
- CSS: Vanilla CSS with CSS Variables (no Tailwind utilities in markup)
- OAuth redirect URI must point to Laravel server (port 8000), not Vite dev (port 3000)
- No database changes — roles hardcoded in PHP config file
- Follow existing code patterns: controllers in `app/Http/Controllers/`, pages in `resources/js/Pages/`

---

### Task 1: Backend Config & Environment

**Files:**
- Create: `config/auth_roles.php`
- Modify: `config/services.php:36-37`
- Modify: `.env:64-66`
- Modify: `.env.example` (end of file)

**Interfaces:**
- Produces: `config('auth_roles.roles')` — array with keys `admin`, `viewer`, each containing email arrays. `config('services.google')` — Google OAuth credentials.

- [ ] **Step 1: Create `config/auth_roles.php`**

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Role-Based Access Control
    |--------------------------------------------------------------------------
    |
    | Map Google email addresses to roles. Emails not listed here
    | are automatically assigned the 'guest' role.
    |
    | admin  - Full access: Report, Top QC, Compare, customer details, Excel export
    | viewer - Limited access: Report only (no customer detail expand), Excel export
    | guest  - No access: sees "unauthorized" page with contact admin message
    |
    */

    'roles' => [
        'admin' => [
            // 'your-admin@gmail.com',
        ],
        'viewer' => [
            // 'your-viewer@gmail.com',
        ],
    ],
];
```

- [ ] **Step 2: Add Google config to `config/services.php`**

Add before the closing `];` in `config/services.php`:

```php
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/auth/google/callback'),
    ],
```

- [ ] **Step 3: Add environment variables to `.env`**

Append to `.env`:

```env
GOOGLE_CLIENT_ID=447366707338-g4f4b9hg9r5jcp0huln56k2jp0oiobvq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

- [ ] **Step 4: Add placeholder environment variables to `.env.example`**

Append to `.env.example`:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

- [ ] **Step 5: Verify config loads**

Run: `php artisan tinker --execute="dd(config('auth_roles.roles'));"`

Expected: Array with `admin` and `viewer` keys.

Run: `php artisan tinker --execute="dd(config('services.google'));"`

Expected: Array with `client_id`, `client_secret`, `redirect` keys populated.

- [ ] **Step 6: Commit**

```bash
git add config/auth_roles.php config/services.php .env.example
git commit -m "feat(auth): add Google OAuth and role config"
```

> Note: Do NOT commit `.env` — it contains secrets and is in `.gitignore`.

---

### Task 2: Auth Controller & Middleware

**Files:**
- Create: `app/Http/Controllers/Auth/GoogleAuthController.php`
- Create: `app/Http/Middleware/CheckAuth.php`
- Create: `app/Http/Middleware/CheckRole.php`

**Interfaces:**
- Consumes: `config('auth_roles.roles')`, `config('services.google')`, Laravel Socialite `Socialite::driver('google')`
- Produces:
  - Session key `auth_user`: `{ name: string, email: string, avatar: string, role: string }`
  - `GoogleAuthController::redirectToGoogle()` — redirects to Google OAuth
  - `GoogleAuthController::handleCallback()` — processes callback, sets session, redirects
  - `GoogleAuthController::logout()` — clears session, redirects to `/login`
  - `CheckAuth` middleware — checks `session('auth_user')`, redirects to `/login` if missing
  - `CheckRole` middleware — checks `session('auth_user.role')` against allowed roles, redirects to `/unauthorized` if denied

- [ ] **Step 1: Create `GoogleAuthController.php`**

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth consent screen.
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle callback from Google OAuth.
     * Determine role from config and store user info in session.
     */
    public function handleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect('/login')->with('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        }

        $email = $googleUser->getEmail();
        $role = $this->resolveRole($email);

        Session::put('auth_user', [
            'name' => $googleUser->getName(),
            'email' => $email,
            'avatar' => $googleUser->getAvatar(),
            'role' => $role,
        ]);

        if ($role === 'guest') {
            return redirect('/unauthorized');
        }

        return redirect('/report');
    }

    /**
     * Clear session and redirect to login.
     */
    public function logout()
    {
        Session::forget('auth_user');
        Session::invalidate();
        Session::regenerateToken();

        return redirect('/login');
    }

    /**
     * Look up the user's email in config/auth_roles.php to determine their role.
     * Returns 'guest' if the email is not found in any role list.
     */
    private function resolveRole(string $email): string
    {
        $roles = config('auth_roles.roles', []);

        foreach ($roles as $roleName => $emails) {
            if (in_array($email, $emails, true)) {
                return $roleName;
            }
        }

        return 'guest';
    }
}
```

- [ ] **Step 2: Create `CheckAuth.php` middleware**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAuth
{
    /**
     * Ensure user has an active auth session.
     * Redirect to /login if not authenticated.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->session()->has('auth_user')) {
            return redirect('/login');
        }

        return $next($request);
    }
}
```

- [ ] **Step 3: Create `CheckRole.php` middleware**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Check if the authenticated user's role is in the allowed list.
     * Usage in routes: ->middleware('check.role:admin,viewer')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->session()->get('auth_user');

        if (!$user || !in_array($user['role'], $roles, true)) {
            return redirect('/unauthorized');
        }

        return $next($request);
    }
}
```

- [ ] **Step 4: Verify files exist and syntax is correct**

Run: `php artisan tinker --execute="echo 'OK';"`

Expected: `OK` (no syntax errors that would prevent boot)

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Auth/GoogleAuthController.php app/Http/Middleware/CheckAuth.php app/Http/Middleware/CheckRole.php
git commit -m "feat(auth): add GoogleAuthController, CheckAuth and CheckRole middleware"
```

---

### Task 3: Register Middleware & Update Routes

**Files:**
- Modify: `bootstrap/app.php:14-17`
- Modify: `routes/web.php` (full rewrite)
- Modify: `app/Http/Middleware/HandleInertiaRequests.php:36-42`

**Interfaces:**
- Consumes: `CheckAuth`, `CheckRole` middleware classes, `GoogleAuthController`, `session('auth_user')`
- Produces:
  - Middleware aliases `check.auth` and `check.role` registered globally
  - Protected route groups with appropriate middleware
  - Inertia shared prop `auth.user` available in all React components via `usePage().props.auth`

- [ ] **Step 1: Register middleware aliases in `bootstrap/app.php`**

Replace the `withMiddleware` block in `bootstrap/app.php`:

```php
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'check.auth' => \App\Http\Middleware\CheckAuth::class,
            'check.role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
```

- [ ] **Step 2: Update `routes/web.php`**

Replace the entire content of `routes/web.php`:

```php
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
    });

    // Routes for admin only
    Route::middleware(['check.role:admin'])->group(function () {
        Route::get('/top-campaign', [TopCampaignController::class, 'index'])->name('top.index');
        Route::get('/compare', [CompareController::class, 'index'])->name('compare.index');
        Route::get('/api/compare-data', [CompareController::class, 'getData'])->name('compare.data');
    });
});
```

- [ ] **Step 3: Share auth user data via Inertia in `HandleInertiaRequests.php`**

Replace the `share` method in `HandleInertiaRequests.php`:

```php
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->session()->get('auth_user'),
            ],
        ];
    }
```

- [ ] **Step 4: Verify routes are registered**

Run: `php artisan route:list --columns=method,uri,name,middleware`

Expected output should include:
- `GET /login` (no middleware)
- `GET /auth/google/redirect` (no middleware)
- `GET /auth/google/callback` (no middleware)
- `POST /auth/logout` (check.auth)
- `GET /unauthorized` (check.auth)
- `GET /report` (check.auth, check.role:admin,viewer)
- `GET /top-campaign` (check.auth, check.role:admin)
- `GET /compare` (check.auth, check.role:admin)

- [ ] **Step 5: Commit**

```bash
git add bootstrap/app.php routes/web.php app/Http/Middleware/HandleInertiaRequests.php
git commit -m "feat(auth): register middleware, protect routes, share auth data via Inertia"
```

---

### Task 4: Login Page (React + CSS)

**Files:**
- Create: `resources/js/Pages/Auth/Login.jsx`
- Modify: `resources/css/app.css` (append login styles at end)

**Interfaces:**
- Consumes: Inertia prop `error` (string|null), route `auth.google.redirect`
- Produces: Login page rendered at `/login` with Google sign-in button

- [ ] **Step 1: Create `Login.jsx`**

```jsx
import React from 'react';
import useTheme from '../../Hooks/useTheme';

export default function Login({ error }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">📊</div>
                    <span className="login-logo-text">SOHAGAME</span>
                </div>

                <h1 className="login-title">Đăng nhập để tiếp tục</h1>
                <p className="login-subtitle">
                    Sử dụng tài khoản Google để truy cập hệ thống báo cáo
                </p>

                {error && (
                    <div className="login-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        {error}
                    </div>
                )}

                <a href="/auth/google/redirect" className="login-google-btn">
                    <svg className="login-google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Đăng nhập bằng Google
                </a>

                <div className="login-footer">
                    <button className="login-theme-toggle" onClick={toggleTheme}>
                        {theme === 'dark' ? '☀️ Giao diện sáng' : '🌙 Giao diện tối'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Append login CSS styles to `resources/css/app.css`**

Add at the end of `resources/css/app.css`:

```css
/* ========== LOGIN PAGE ========== */
.login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
    background: var(--bg-primary);
    padding: 20px;
}

.login-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 48px 40px;
    width: 100%;
    max-width: 420px;
    text-align: center;
    box-shadow: var(--shadow-lg);
    animation: modalIn 0.4s ease;
}

.login-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 32px;
}

.login-logo-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 0 24px var(--accent-glow);
}

.login-logo-text {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--text-primary), var(--accent-hover));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.login-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.login-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 32px;
    line-height: 1.5;
}

.login-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: var(--red);
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    margin-bottom: 24px;
}

.login-google-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 14px 24px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
}

.login-google-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    transform: translateY(-1px);
}

.login-google-btn:active {
    transform: translateY(0);
}

.login-google-icon {
    flex-shrink: 0;
}

.login-footer {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
}

.login-theme-toggle {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
}

.login-theme-toggle:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
}

/* ========== UNAUTHORIZED PAGE ========== */
.unauthorized-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
    background: var(--bg-primary);
    padding: 20px;
}

.unauthorized-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 48px 40px;
    width: 100%;
    max-width: 420px;
    text-align: center;
    box-shadow: var(--shadow-lg);
    animation: modalIn 0.4s ease;
}

.unauthorized-icon {
    font-size: 48px;
    margin-bottom: 20px;
}

.unauthorized-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
}

.unauthorized-message {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 8px;
}

.unauthorized-email {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 28px;
    font-style: italic;
}

.unauthorized-logout-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    text-decoration: none;
}

.unauthorized-logout-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
}

/* ========== USER PROFILE (Sidebar) ========== */
.user-profile {
    padding: 14px 14px;
    border-top: 1px solid var(--sidebar-border);
    display: flex;
    align-items: center;
    gap: 10px;
}

.user-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
    flex-shrink: 0;
}

.user-avatar-placeholder {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
}

.user-info {
    flex: 1;
    min-width: 0;
}

.user-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-email {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-logout-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.user-logout-btn:hover {
    color: var(--red);
    background: rgba(248, 113, 113, 0.1);
}
```

- [ ] **Step 3: Verify the Login page renders**

Start dev server if not running: `composer dev` or manually `php artisan serve` + `npm run dev`

Navigate to `http://localhost:8000/login` in browser.

Expected: Centered card with SOHAGAME logo, title, subtitle, Google sign-in button, theme toggle at bottom. Dark mode by default.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Auth/Login.jsx resources/css/app.css
git commit -m "feat(auth): add Login page with Google sign-in button"
```

---

### Task 5: Unauthorized Page & UserProfile Component

**Files:**
- Create: `resources/js/Pages/Auth/Unauthorized.jsx`
- Create: `resources/js/Components/Sidebar/UserProfile.jsx`

**Interfaces:**
- Consumes: Inertia shared prop `auth.user` via `usePage().props.auth`
- Produces:
  - `Unauthorized` page rendered at `/unauthorized`
  - `UserProfile` component: renders avatar, name, email, logout button. Accepts no props — reads from `usePage()`.

- [ ] **Step 1: Create `Unauthorized.jsx`**

```jsx
import React from 'react';
import { usePage, router } from '@inertiajs/react';
import useTheme from '../../Hooks/useTheme';

export default function Unauthorized() {
    const { auth } = usePage().props;
    const { theme, toggleTheme } = useTheme();
    const user = auth?.user;

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/auth/logout');
    };

    return (
        <div className="unauthorized-page">
            <div className="unauthorized-card">
                <div className="unauthorized-icon">🔒</div>
                <h1 className="unauthorized-title">Không có quyền truy cập</h1>
                <p className="unauthorized-message">
                    Tài khoản của bạn chưa được cấp quyền sử dụng hệ thống.
                    Vui lòng liên hệ Admin để được cấp quyền.
                </p>
                {user && (
                    <p className="unauthorized-email">
                        Đang đăng nhập với: {user.email}
                    </p>
                )}
                <button onClick={handleLogout} className="unauthorized-logout-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Đăng xuất
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create `UserProfile.jsx`**

```jsx
import React from 'react';
import { usePage, router } from '@inertiajs/react';

export default function UserProfile() {
    const { auth } = usePage().props;
    const user = auth?.user;

    if (!user) return null;

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/auth/logout');
    };

    const initials = user.name
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <div className="user-profile">
            {user.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.name}
                    className="user-avatar"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="user-avatar-placeholder">{initials}</div>
            )}
            <div className="user-info">
                <div className="user-name" title={user.name}>{user.name}</div>
                <div className="user-email" title={user.email}>{user.email}</div>
            </div>
            <button
                onClick={handleLogout}
                className="user-logout-btn"
                title="Đăng xuất"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
            </button>
        </div>
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Auth/Unauthorized.jsx resources/js/Components/Sidebar/UserProfile.jsx
git commit -m "feat(auth): add Unauthorized page and UserProfile sidebar component"
```

---

### Task 6: Update Sidebar with Role-Based Menu & User Profile

**Files:**
- Modify: `resources/js/Components/Sidebar/Sidebar.jsx` (full rewrite)

**Interfaces:**
- Consumes: `usePage().props.auth.user` (object with `name`, `email`, `avatar`, `role`), `UserProfile` component
- Produces: Updated Sidebar that hides menu items based on `role`, includes `UserProfile` at bottom

- [ ] **Step 1: Update `Sidebar.jsx`**

Replace the entire content of `resources/js/Components/Sidebar/Sidebar.jsx`:

```jsx
import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import ThemeToggle from './ThemeToggle';
import UserProfile from './UserProfile';

export default function Sidebar() {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const role = user?.role;

    const isActive = (path) => url.startsWith(path);

    // Define menu items with their required roles
    const menuItems = [
        {
            href: '/report',
            label: 'Báo cáo',
            roles: ['admin', 'viewer'],
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="4" rx="1" />
                    <rect x="14" y="10" width="7" height="11" rx="1" />
                    <rect x="3" y="13" width="7" height="8" rx="1" />
                </svg>
            ),
        },
        {
            href: '/top-campaign',
            label: 'Top QC',
            roles: ['admin'],
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 21h8M12 17v4M7 4h10l2 7H5L7 4zM12 11l-3 4h6l-3-4z" />
                </svg>
            ),
        },
        {
            href: '/compare',
            label: 'So sánh',
            roles: ['admin'],
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
            ),
        },
    ];

    // Filter menu items based on user role
    const visibleItems = menuItems.filter(item => role && item.roles.includes(role));

    return (
        <nav className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">📊</div>
                    <span className="sidebar-logo-text">SOHAGAME</span>
                </div>
            </div>

            <ThemeToggle />

            <div className="sidebar-nav">
                <div className="sidebar-nav-label">Menu</div>
                {visibleItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </div>

            <UserProfile />
        </nav>
    );
}
```

- [ ] **Step 2: Verify Sidebar renders correctly**

With dev server running, login as admin → verify all 3 menu items visible + UserProfile at bottom.

Login as viewer → verify only "Báo cáo" visible.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Components/Sidebar/Sidebar.jsx
git commit -m "feat(auth): update Sidebar with role-based menu and UserProfile"
```

---

### Task 7: Update Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: None
- Produces: Updated README with auth feature description and setup instructions

- [ ] **Step 1: Update `README.md`**

Add the following sections to `README.md`. Insert after the "Tính năng chính" section (after the Compare bullet point, before the "Tính năng Lọc mạnh mẽ" bullet):

Add this bullet to the feature list:
```markdown
- **Đăng nhập Google (OAuth 2.0):** Xác thực người dùng qua Google OAuth, phân quyền theo role (Admin/Viewer/Guest) với danh sách email cấu hình trong file PHP. Session-based authentication kết hợp Inertia.js shared data.
```

Add a new section after "⚙️ Hướng dẫn Cài đặt & Chạy Local" → "2. Cài đặt Laravel & Frontend", before "3. Chạy Server phát triển":

```markdown
### 2.5 Cấu hình Google OAuth

1. Tạo OAuth 2.0 Client ID tại [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Cấu hình Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
3. Thêm thông tin vào file `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

4. Cấu hình phân quyền trong `config/auth_roles.php`:

```php
'roles' => [
    'admin' => ['admin@gmail.com'],
    'viewer' => ['viewer@gmail.com'],
],
```

| Role | Quyền |
|---|---|
| Admin | Đầy đủ: Report, Top QC, Compare, xem customer, xuất Excel |
| Viewer | Report (không xem chi tiết customer), xuất Excel |
| Guest | Không có quyền, hiển thị trang thông báo liên hệ Admin |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with Google OAuth setup instructions"
```

---

### Task 8: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Ensure dev server is running**

Run: `composer dev` (or `php artisan serve` + `npm run dev` in separate terminals)

- [ ] **Step 2: Test unauthenticated redirect**

Navigate to `http://localhost:8000/report`

Expected: Redirected to `/login`

- [ ] **Step 3: Test Google OAuth login flow**

1. On `/login`, click "Đăng nhập bằng Google"
2. Google consent screen appears
3. Select Google account
4. Redirected back to `/report` (if email is admin/viewer) or `/unauthorized` (if guest)

- [ ] **Step 4: Test role-based access**

As admin:
- Navigate to `/report` → ✅ loads
- Navigate to `/top-campaign` → ✅ loads
- Navigate to `/compare` → ✅ loads
- Sidebar shows all 3 menu items + UserProfile

As viewer:
- Navigate to `/report` → ✅ loads
- Navigate to `/top-campaign` → ❌ redirected to `/unauthorized`
- Sidebar shows only "Báo cáo" + UserProfile

As guest:
- After login → redirected to `/unauthorized`
- Shows message + email + logout button

- [ ] **Step 5: Test logout**

Click logout button in Sidebar (or on Unauthorized page)

Expected: Session cleared, redirected to `/login`

- [ ] **Step 6: Test theme toggle on login page**

On `/login`, click theme toggle at bottom.

Expected: Switches between dark/light mode.

- [ ] **Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "feat(auth): complete Google OAuth with role-based authorization"
```
