# Dynamic RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded `config/auth_roles.php` with a dynamic RBAC system backed by SQLite, running alongside the read-only MySQL ads database. Add an admin panel for managing roles and users.

**Architecture:** SQLite becomes the default Laravel DB connection for all system tables (users, roles, pages, sessions). MySQL stays as a named secondary connection (`mysql`) used only by the `ads` model. The `GoogleAuthController` upserts users into SQLite on Google login and resolves role/permissions from DB instead of config. A new `CheckPageAccess` middleware replaces the old `CheckRole` parameter-based approach, reading permissions fresh from DB each request. An Inertia React admin panel at `/admin` provides CRUD for roles (with allowed_customers and allowed_pages) and user management (search, paginate, assign role, delete).

**Tech Stack:** Laravel 12, SQLite, MySQL (read-only), Inertia.js, React, Eloquent ORM

## Global Constraints

- SQLite database file: `database/database.sqlite`
- MySQL connection is READ-ONLY — never run migrations or writes against it
- All new models default to SQLite (the `default` connection)
- Only `app/Models/ads.php` uses `protected $connection = 'mysql'`
- Follow existing CSS variable system in `resources/css/app.css` (dark/light theme)
- All routes use existing middleware pattern from `bootstrap/app.php`
- Email `minhducqwe0123@gmail.com` is the default admin — always seeded, cannot be deleted

---

### Task 1: Dual Database Configuration

Configure SQLite as the default database and MySQL as a named secondary connection.

**Files:**
- Modify: `.env`
- Modify: `config/database.php`
- Modify: `app/Models/ads.php`
- Create: `database/database.sqlite`

**Interfaces:**
- Consumes: existing `.env` vars (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`)
- Produces: `DB_CONNECTION=sqlite` as default, `mysql` connection available via `DB::connection('mysql')` or model `$connection` property

- [ ] **Step 1: Create empty SQLite database file**

```bash
# Windows PowerShell
New-Item -Path "database/database.sqlite" -ItemType File -Force
```

- [ ] **Step 2: Update `.env` — switch default to SQLite, add MySQL vars**

Replace the DB section in `.env`:

```env
DB_CONNECTION=sqlite

# MySQL connection (read-only, ads warehouse)
DB_MYSQL_HOST=172.16.11.13
DB_MYSQL_PORT=3306
DB_MYSQL_DATABASE=sohagame_ads_warehouse
DB_MYSQL_USERNAME=ducnguyenminh
DB_MYSQL_PASSWORD="DucNguyenMinh@2026!"
```

Remove the old `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` lines.

- [ ] **Step 3: Update `config/database.php` — MySQL uses dedicated env vars**

Change the `mysql` connection to read from `DB_MYSQL_*` env vars instead of `DB_*`:

```php
'mysql' => [
    'driver' => 'mysql',
    'url' => env('DB_URL'),
    'host' => env('DB_MYSQL_HOST', '127.0.0.1'),
    'port' => env('DB_MYSQL_PORT', '3306'),
    'database' => env('DB_MYSQL_DATABASE', 'laravel'),
    'username' => env('DB_MYSQL_USERNAME', 'root'),
    'password' => env('DB_MYSQL_PASSWORD', ''),
    'unix_socket' => env('DB_SOCKET', ''),
    'charset' => env('DB_CHARSET', 'utf8mb4'),
    'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
    'prefix' => '',
    'prefix_indexes' => true,
    'strict' => true,
    'engine' => null,
    'options' => extension_loaded('pdo_mysql') ? array_filter([
        Mysql::ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
    ]) : [],
],
```

- [ ] **Step 4: Update `app/Models/ads.php` — specify MySQL connection**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ads extends Model
{
    protected $connection = 'mysql';
    protected $table = 'split_campaigns_6__dbt_tmp';

    public $timestamps = false;
}
```

- [ ] **Step 5: Verify dual database works**

Run: `php artisan tinker --execute="echo DB::connection()->getDatabaseName() . ' | ' . DB::connection('mysql')->getDatabaseName();"`

Expected output contains: `database.sqlite | sohagame_ads_warehouse`

- [ ] **Step 6: Commit**

```bash
git add .env config/database.php app/Models/ads.php database/database.sqlite
git commit -m "feat: configure SQLite as default DB, MySQL as secondary read-only connection"
```

---

### Task 2: RBAC Migrations and Models

Create the 5 database tables and their Eloquent models. Update the existing `User` model.

**Files:**
- Create: `database/migrations/2026_07_07_000001_create_roles_table.php`
- Create: `database/migrations/2026_07_07_000002_create_pages_table.php`
- Create: `database/migrations/2026_07_07_000003_create_role_pages_table.php`
- Modify: `database/migrations/0001_01_01_000000_create_users_table.php`
- Create: `database/migrations/2026_07_07_000004_create_user_roles_table.php`
- Create: `app/Models/Role.php`
- Create: `app/Models/Page.php`
- Modify: `app/Models/User.php`

**Interfaces:**
- Consumes: SQLite default connection
- Produces: Eloquent models `Role`, `Page`, `User` with relationships:
  - `User::role(): Role|null` (through user_roles)
  - `User::userRole(): UserRole|null` (hasOne)
  - `Role::pages(): Collection<Page>` (belongsToMany via role_pages)
  - `Role::users(): Collection<User>` (belongsToMany via user_roles)
  - `Role::allowedCustomersArray(): array` (accessor parsing JSON)
  - `Page::roles(): Collection<Role>` (belongsToMany via role_pages)

- [ ] **Step 1: Create roles migration**

Create `database/migrations/2026_07_07_000001_create_roles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('display_name', 255)->nullable();
            $table->text('description')->nullable();
            $table->text('allowed_customers')->default('["*"]'); // JSON array
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
```

- [ ] **Step 2: Create pages migration**

Create `database/migrations/2026_07_07_000002_create_pages_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('label', 255);
            $table->string('route_name', 255);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
```

- [ ] **Step 3: Create role_pages migration**

Create `database/migrations/2026_07_07_000003_create_role_pages_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('page_id')->constrained('pages')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['role_id', 'page_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_pages');
    }
};
```

- [ ] **Step 4: Update users migration — add Google fields**

Modify `database/migrations/0001_01_01_000000_create_users_table.php`. In the `users` table schema, make `password` nullable and add new columns:

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password')->nullable(); // Made nullable for Google OAuth users
    $table->string('avatar', 500)->nullable();
    $table->string('google_id', 255)->nullable();
    $table->timestamp('last_login_at')->nullable();
    $table->rememberToken();
    $table->timestamps();
});
```

- [ ] **Step 5: Create user_roles migration**

Create `database/migrations/2026_07_07_000004_create_user_roles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_roles');
    }
};
```

- [ ] **Step 6: Create `app/Models/Role.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = ['name', 'display_name', 'description', 'allowed_customers', 'is_system'];

    protected function casts(): array
    {
        return [
            'allowed_customers' => 'array',
            'is_system' => 'boolean',
        ];
    }

    public function pages(): BelongsToMany
    {
        return $this->belongsToMany(Page::class, 'role_pages');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    /**
     * Check if this role has unrestricted customer access.
     */
    public function hasFullCustomerAccess(): bool
    {
        $customers = $this->allowed_customers ?? [];
        return in_array('*', $customers);
    }
}
```

- [ ] **Step 7: Create `app/Models/Page.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Page extends Model
{
    protected $fillable = ['slug', 'label', 'route_name'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_pages');
    }
}
```

- [ ] **Step 8: Create `app/Models/UserRole.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserRole extends Model
{
    protected $fillable = ['user_id', 'role_id', 'assigned_by'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
```

- [ ] **Step 9: Update `app/Models/User.php`**

```php
<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'avatar', 'google_id', 'last_login_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function userRole(): HasOne
    {
        return $this->hasOne(UserRole::class);
    }

    /**
     * Get the user's role (through user_roles pivot).
     */
    public function role(): ?Role
    {
        return $this->userRole?->role;
    }

    /**
     * Get allowed page slugs for this user.
     */
    public function allowedPageSlugs(): array
    {
        $role = $this->role();
        if (!$role) return [];
        return $role->pages()->pluck('slug')->toArray();
    }

    /**
     * Get allowed customers for this user.
     */
    public function allowedCustomers(): array
    {
        $role = $this->role();
        if (!$role) return [];
        return $role->allowed_customers ?? [];
    }
}
```

- [ ] **Step 10: Run migrations to verify**

Run: `php artisan migrate:fresh`

Expected: All tables created successfully on SQLite (users, roles, pages, role_pages, user_roles, password_reset_tokens, sessions, cache, jobs, personal_access_tokens).

- [ ] **Step 11: Commit**

```bash
git add database/migrations/ app/Models/
git commit -m "feat: create RBAC schema (roles, pages, role_pages, user_roles) and Eloquent models"
```

---

### Task 3: Database Seeder

Seed default roles, pages, role-page mappings, and the default admin user.

**Files:**
- Create: `database/seeders/RbacSeeder.php`
- Modify: `database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Consumes: `Role`, `Page`, `User`, `UserRole` models from Task 2
- Produces: Seeded data — 3 roles, 4 pages, role-page mappings, 1 admin user with role assignment

- [ ] **Step 1: Create `database/seeders/RbacSeeder.php`**

```php
<?php

namespace Database\Seeders;

use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        // --- Create system roles ---
        $admin = Role::firstOrCreate(
            ['name' => 'admin'],
            [
                'display_name' => 'Quản trị viên',
                'description' => 'Toàn quyền truy cập hệ thống, quản lý phân quyền',
                'allowed_customers' => ['*'],
                'is_system' => true,
            ]
        );

        $viewer = Role::firstOrCreate(
            ['name' => 'viewer'],
            [
                'display_name' => 'Người xem',
                'description' => 'Xem báo cáo và dữ liệu, không quản lý hệ thống',
                'allowed_customers' => ['*'],
                'is_system' => true,
            ]
        );

        $guest = Role::firstOrCreate(
            ['name' => 'guest'],
            [
                'display_name' => 'Khách',
                'description' => 'Chưa được cấp quyền, liên hệ admin',
                'allowed_customers' => [],
                'is_system' => true,
            ]
        );

        // --- Create pages ---
        $reportPage = Page::firstOrCreate(
            ['slug' => 'report'],
            ['label' => 'Báo cáo', 'route_name' => 'report.index']
        );

        $topCampaignPage = Page::firstOrCreate(
            ['slug' => 'top-campaign'],
            ['label' => 'Top QC', 'route_name' => 'top.index']
        );

        $comparePage = Page::firstOrCreate(
            ['slug' => 'compare'],
            ['label' => 'So sánh', 'route_name' => 'compare.index']
        );

        $adminPage = Page::firstOrCreate(
            ['slug' => 'admin-panel'],
            ['label' => 'Quản lý phân quyền', 'route_name' => 'admin.index']
        );

        // --- Assign pages to roles ---
        $admin->pages()->syncWithoutDetaching([
            $reportPage->id,
            $topCampaignPage->id,
            $comparePage->id,
            $adminPage->id,
        ]);

        $viewer->pages()->syncWithoutDetaching([
            $reportPage->id,
            $topCampaignPage->id,
        ]);

        // guest gets no pages

        // --- Create default admin user ---
        $adminUser = User::firstOrCreate(
            ['email' => 'minhducqwe0123@gmail.com'],
            [
                'name' => 'Admin',
                'password' => null,
            ]
        );

        UserRole::firstOrCreate(
            ['user_id' => $adminUser->id],
            [
                'role_id' => $admin->id,
                'assigned_by' => null,
            ]
        );
    }
}
```

- [ ] **Step 2: Update `database/seeders/DatabaseSeeder.php`**

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RbacSeeder::class,
        ]);
    }
}
```

- [ ] **Step 3: Verify seeder works**

Run: `php artisan migrate:fresh --seed`

Expected: All tables created, 3 roles, 4 pages, role-page mappings, and admin user seeded.

Run: `php artisan tinker --execute="echo App\Models\Role::count() . ' roles, ' . App\Models\Page::count() . ' pages, ' . App\Models\User::count() . ' users';"`

Expected: `3 roles, 4 pages, 1 users`

- [ ] **Step 4: Verify relationships**

Run: `php artisan tinker --execute="echo App\Models\Role::where('name','admin')->first()->pages->pluck('slug')->join(', ');"`

Expected: `report, top-campaign, compare, admin-panel`

- [ ] **Step 5: Commit**

```bash
git add database/seeders/
git commit -m "feat: add RBAC seeder with default roles, pages, and admin user"
```

---

### Task 4: Update GoogleAuthController — DB-backed role resolution

Replace config-based role lookup with database queries. Upsert user on login, load permissions from DB.

**Files:**
- Modify: `app/Http/Controllers/Auth/GoogleAuthController.php`

**Interfaces:**
- Consumes: `User`, `UserRole`, `Role` models. `Socialite::driver('google')->user()` returns Google user info.
- Produces: Session `auth_user` now contains `allowed_pages` array and `user_id` integer in addition to existing fields. Method `resolveRoleAndCustomers` replaced by DB logic.

- [ ] **Step 1: Rewrite `GoogleAuthController.php`**

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
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
     * Upsert user in SQLite, resolve role from DB, store in session.
     */
    public function handleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect('/login')->with('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        }

        $email = $googleUser->getEmail();

        // Upsert user in SQLite
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $googleUser->getName(),
                'avatar' => $googleUser->getAvatar(),
                'google_id' => $googleUser->getId(),
                'last_login_at' => now(),
            ]
        );

        // Resolve role from DB
        $accessData = $this->resolvePermissions($user);

        Session::put('auth_user', [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $email,
            'avatar' => $user->avatar,
            'role' => $accessData['role_name'],
            'allowed_customers' => $accessData['allowed_customers'],
            'allowed_pages' => $accessData['allowed_pages'],
        ]);

        if (empty($accessData['allowed_pages'])) {
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
     * Resolve user's role, allowed_customers, and allowed_pages from DB.
     * If user has no role assigned, assign 'guest' by default.
     */
    private function resolvePermissions(User $user): array
    {
        $userRole = $user->userRole()->with('role.pages')->first();

        if (!$userRole) {
            // Assign guest role by default
            $guestRole = Role::where('name', 'guest')->first();
            if ($guestRole) {
                UserRole::create([
                    'user_id' => $user->id,
                    'role_id' => $guestRole->id,
                ]);
                $userRole = $user->userRole()->with('role.pages')->first();
            }
        }

        if (!$userRole || !$userRole->role) {
            return [
                'role_name' => 'guest',
                'allowed_customers' => [],
                'allowed_pages' => [],
            ];
        }

        $role = $userRole->role;

        return [
            'role_name' => $role->name,
            'allowed_customers' => $role->allowed_customers ?? [],
            'allowed_pages' => $role->pages->pluck('slug')->toArray(),
        ];
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/Auth/GoogleAuthController.php
git commit -m "feat: GoogleAuthController uses DB for user upsert and role resolution"
```

---

### Task 5: Update Middleware — Page-based access control with DB refresh

Replace hardcoded role checks with page-slug-based access control. Refresh permissions from DB each request.

**Files:**
- Modify: `app/Http/Middleware/CheckRole.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Modify: `routes/web.php`
- Modify: `bootstrap/app.php`

**Interfaces:**
- Consumes: `User` model with `userRole.role.pages` relationships. Session `auth_user.user_id`. Route names mapping to page slugs.
- Produces: Updated `CheckPageAccess` middleware (renamed from `CheckRole`). Middleware registered as `check.page` alias. Session `auth_user` refreshed with current DB permissions on each request. Inertia shared data includes `allowed_pages`.

- [ ] **Step 1: Rewrite `app/Http/Middleware/CheckRole.php` to `CheckPageAccess`**

Rename file to `CheckPageAccess.php` and rewrite:

```php
<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPageAccess
{
    /**
     * Route name prefix → page slug mapping.
     */
    private const ROUTE_PAGE_MAP = [
        'report.' => 'report',
        'top.' => 'top-campaign',
        'compare.' => 'compare',
        'admin.' => 'admin-panel',
    ];

    /**
     * Refresh permissions from DB and check if the user can access the current page.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $sessionUser = $request->session()->get('auth_user');
        if (!$sessionUser || !isset($sessionUser['user_id'])) {
            return redirect('/unauthorized');
        }

        // Refresh permissions from DB on every request
        $user = User::with('userRole.role.pages')->find($sessionUser['user_id']);
        if (!$user || !$user->userRole || !$user->userRole->role) {
            $request->session()->forget('auth_user');
            return redirect('/login');
        }

        $role = $user->userRole->role;
        $allowedPages = $role->pages->pluck('slug')->toArray();
        $allowedCustomers = $role->allowed_customers ?? [];

        // Update session with fresh DB data
        $request->session()->put('auth_user', array_merge($sessionUser, [
            'role' => $role->name,
            'allowed_customers' => $allowedCustomers,
            'allowed_pages' => $allowedPages,
        ]));

        // Check page access
        $routeName = $request->route()?->getName() ?? '';
        $pageSlug = $this->routeToPageSlug($routeName);

        if ($pageSlug && !in_array($pageSlug, $allowedPages)) {
            return redirect('/unauthorized');
        }

        return $next($request);
    }

    /**
     * Map a Laravel route name to a page slug.
     */
    private function routeToPageSlug(string $routeName): ?string
    {
        foreach (self::ROUTE_PAGE_MAP as $prefix => $slug) {
            if (str_starts_with($routeName, $prefix)) {
                return $slug;
            }
        }
        return null;
    }
}
```

- [ ] **Step 2: Delete old `app/Http/Middleware/CheckRole.php`**

```bash
Remove-Item -Path "app/Http/Middleware/CheckRole.php" -Force
```

(Only if you created the new file separately. If you renamed in-place, skip this.)

- [ ] **Step 3: Update `bootstrap/app.php` — register new middleware alias**

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'check.auth' => \App\Http\Middleware\CheckAuth::class,
            'check.page' => \App\Http\Middleware\CheckPageAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
```

- [ ] **Step 4: Update `app/Http/Middleware/HandleInertiaRequests.php` — share allowed_pages**

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $authUser = $request->session()->get('auth_user');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $authUser ? [
                    'user_id' => $authUser['user_id'] ?? null,
                    'name' => $authUser['name'] ?? null,
                    'email' => $authUser['email'] ?? null,
                    'avatar' => $authUser['avatar'] ?? null,
                    'role' => $authUser['role'] ?? null,
                    'allowed_pages' => $authUser['allowed_pages'] ?? [],
                ] : null,
            ],
        ];
    }
}
```

- [ ] **Step 5: Update `routes/web.php` — use `check.page` middleware**

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CompareController;
use App\Http\Controllers\TopCampaignController;
use App\Http\Controllers\AdminController;
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

    // All page-access-controlled routes
    Route::middleware(['check.page'])->group(function () {
        Route::get('/', fn () => redirect('/report'));
        Route::get('/report', [ReportController::class, 'index'])->name('report.index');
        Route::get('/top-campaign', [TopCampaignController::class, 'index'])->name('top.index');
        Route::get('/compare', [CompareController::class, 'index'])->name('compare.index');
        Route::get('/api/compare-data', [CompareController::class, 'getData'])->name('compare.data');

        // Admin panel
        Route::get('/admin', [AdminController::class, 'index'])->name('admin.index');
        Route::post('/admin/roles', [AdminController::class, 'storeRole'])->name('admin.roles.store');
        Route::put('/admin/roles/{id}', [AdminController::class, 'updateRole'])->name('admin.roles.update');
        Route::delete('/admin/roles/{id}', [AdminController::class, 'deleteRole'])->name('admin.roles.delete');
        Route::put('/admin/users/{id}/role', [AdminController::class, 'updateUserRole'])->name('admin.users.updateRole');
        Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser'])->name('admin.users.delete');
    });
});
```

- [ ] **Step 6: Commit**

```bash
git add app/Http/Middleware/ bootstrap/app.php routes/web.php
git commit -m "feat: replace CheckRole with CheckPageAccess middleware, refresh perms from DB each request"
```

---

### Task 6: Update Sidebar — Dynamic menu from allowed_pages

Update the Sidebar component to build menu items based on `allowed_pages` from session instead of hardcoded role checks.

**Files:**
- Modify: `resources/js/Components/Sidebar/Sidebar.jsx`

**Interfaces:**
- Consumes: `usePage().props.auth.user.allowed_pages` (array of page slugs from Inertia shared data)
- Produces: Sidebar menu shows only pages the user has access to. Admin panel menu item appears when user has `admin-panel` in allowed_pages.

- [ ] **Step 1: Rewrite `Sidebar.jsx`**

```jsx
import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import ThemeToggle from './ThemeToggle';
import UserProfile from './UserProfile';

export default function Sidebar() {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const allowedPages = user?.allowed_pages || [];

    const isActive = (path) => url.startsWith(path);

    // All possible menu items mapped by page slug
    const allMenuItems = [
        {
            slug: 'report',
            href: '/report',
            label: 'Báo cáo',
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
            slug: 'top-campaign',
            href: '/top-campaign',
            label: 'Top QC',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 21h8M12 17v4M7 4h10l2 7H5L7 4zM12 11l-3 4h6l-3-4z" />
                </svg>
            ),
        },
        {
            slug: 'compare',
            href: '/compare',
            label: 'So sánh',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
            ),
        },
        {
            slug: 'admin-panel',
            href: '/admin',
            label: 'Quản lý',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
        },
    ];

    // Filter menu items based on allowed_pages
    const visibleItems = allMenuItems.filter(item => allowedPages.includes(item.slug));

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

- [ ] **Step 2: Commit**

```bash
git add resources/js/Components/Sidebar/Sidebar.jsx
git commit -m "feat: Sidebar menu driven by allowed_pages instead of hardcoded roles"
```

---

### Task 7: Admin Panel Backend — AdminController

Create the controller that serves the admin panel page and handles all CRUD operations for roles and users.

**Files:**
- Create: `app/Http/Controllers/AdminController.php`

**Interfaces:**
- Consumes: `User`, `Role`, `Page`, `UserRole` models. Inertia rendering. Request input for search/pagination/CRUD.
- Produces:
  - `index(Request): InertiaResponse` — renders `Admin/Index` with `roles`, `pages`, `users` (paginated)
  - `storeRole(Request): RedirectResponse` — creates a new role with page assignments
  - `updateRole(Request, int $id): RedirectResponse` — updates role info and page assignments
  - `deleteRole(int $id): RedirectResponse` — deletes non-system role
  - `updateUserRole(Request, int $id): RedirectResponse` — assigns role to user
  - `deleteUser(int $id): RedirectResponse` — deletes user and their user_role

- [ ] **Step 1: Create `app/Http/Controllers/AdminController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminController extends Controller
{
    /**
     * Display the admin panel with roles and users data.
     */
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $page = $request->input('page', 1);

        // Load all roles with their pages
        $roles = Role::with('pages')
            ->withCount('userRoles')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name,
                    'description' => $role->description,
                    'allowed_customers' => $role->allowed_customers,
                    'is_system' => $role->is_system,
                    'page_ids' => $role->pages->pluck('id')->toArray(),
                    'page_slugs' => $role->pages->pluck('slug')->toArray(),
                    'user_count' => $role->user_roles_count,
                ];
            });

        // Load all pages
        $pages = Page::orderBy('slug')->get(['id', 'slug', 'label']);

        // Load users with search and pagination
        $usersQuery = User::with('userRole.role')
            ->orderBy('name');

        if ($search) {
            $usersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $usersPaginated = $usersQuery->paginate(15, ['*'], 'page', $page);

        $users = [
            'data' => $usersPaginated->getCollection()->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'last_login_at' => $user->last_login_at?->format('d/m/Y H:i'),
                    'role_id' => $user->userRole?->role_id,
                    'role_name' => $user->userRole?->role?->name,
                    'role_display_name' => $user->userRole?->role?->display_name,
                ];
            }),
            'current_page' => $usersPaginated->currentPage(),
            'last_page' => $usersPaginated->lastPage(),
            'total' => $usersPaginated->total(),
        ];

        $currentUserId = $request->session()->get('auth_user.user_id');

        return Inertia::render('Admin/Index', [
            'roles' => $roles,
            'pages' => $pages,
            'users' => $users,
            'search' => $search,
            'currentUserId' => $currentUserId,
        ]);
    }

    /**
     * Create a new role.
     */
    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name|regex:/^[a-z0-9_-]+$/',
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'allowed_customers' => 'required|string',
            'page_ids' => 'array',
            'page_ids.*' => 'integer|exists:pages,id',
        ]);

        $allowedCustomers = $this->parseAllowedCustomers($validated['allowed_customers']);

        $role = Role::create([
            'name' => $validated['name'],
            'display_name' => $validated['display_name'] ?? null,
            'description' => $validated['description'] ?? null,
            'allowed_customers' => $allowedCustomers,
            'is_system' => false,
        ]);

        if (!empty($validated['page_ids'])) {
            $role->pages()->sync($validated['page_ids']);
        }

        return redirect()->back()->with('success', 'Tạo role thành công.');
    }

    /**
     * Update an existing role.
     */
    public function updateRole(Request $request, int $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'display_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'allowed_customers' => 'required|string',
            'page_ids' => 'array',
            'page_ids.*' => 'integer|exists:pages,id',
        ]);

        $allowedCustomers = $this->parseAllowedCustomers($validated['allowed_customers']);

        // System role 'admin' must always have admin-panel page
        if ($role->is_system && $role->name === 'admin') {
            $adminPage = Page::where('slug', 'admin-panel')->first();
            if ($adminPage && !in_array($adminPage->id, $validated['page_ids'] ?? [])) {
                $validated['page_ids'][] = $adminPage->id;
            }
        }

        $role->update([
            'display_name' => $validated['display_name'] ?? $role->display_name,
            'description' => $validated['description'] ?? $role->description,
            'allowed_customers' => $allowedCustomers,
        ]);

        $role->pages()->sync($validated['page_ids'] ?? []);

        return redirect()->back()->with('success', 'Cập nhật role thành công.');
    }

    /**
     * Delete a role (non-system only).
     */
    public function deleteRole(int $id)
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return redirect()->back()->with('error', 'Không thể xóa role hệ thống.');
        }

        // Move users with this role to 'guest'
        $guestRole = Role::where('name', 'guest')->first();
        if ($guestRole) {
            UserRole::where('role_id', $role->id)->update(['role_id' => $guestRole->id]);
        }

        $role->delete();

        return redirect()->back()->with('success', 'Xóa role thành công.');
    }

    /**
     * Assign a role to a user.
     */
    public function updateUserRole(Request $request, int $id)
    {
        $validated = $request->validate([
            'role_id' => 'required|integer|exists:roles,id',
        ]);

        $currentUserId = $request->session()->get('auth_user.user_id');

        if ((int) $id === (int) $currentUserId) {
            return redirect()->back()->with('error', 'Không thể tự đổi role của chính mình.');
        }

        $user = User::findOrFail($id);

        UserRole::updateOrCreate(
            ['user_id' => $user->id],
            [
                'role_id' => $validated['role_id'],
                'assigned_by' => $currentUserId,
            ]
        );

        return redirect()->back()->with('success', "Đã cập nhật role cho {$user->email}.");
    }

    /**
     * Delete a user.
     */
    public function deleteUser(Request $request, int $id)
    {
        $currentUserId = $request->session()->get('auth_user.user_id');

        if ((int) $id === (int) $currentUserId) {
            return redirect()->back()->with('error', 'Không thể tự xóa chính mình.');
        }

        $user = User::findOrFail($id);

        // Protect default admin
        if ($user->email === 'minhducqwe0123@gmail.com') {
            return redirect()->back()->with('error', 'Không thể xóa tài khoản admin mặc định.');
        }

        $user->delete(); // Cascades to user_roles due to FK

        return redirect()->back()->with('success', "Đã xóa user {$user->email}.");
    }

    /**
     * Parse allowed_customers from comma-separated string to array.
     * Input: "*" or "sg432, sg123" or ""
     * Output: ["*"] or ["sg432", "sg123"] or []
     */
    private function parseAllowedCustomers(string $input): array
    {
        $input = trim($input);
        if ($input === '' || $input === '[]') {
            return [];
        }
        if ($input === '*') {
            return ['*'];
        }
        return array_values(array_filter(array_map('trim', explode(',', $input))));
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/AdminController.php
git commit -m "feat: AdminController with CRUD for roles and users"
```

---

### Task 8: Admin Panel Frontend — React Admin/Index page

Create the React page with two tabs: Roles management and Users management.

**Files:**
- Create: `resources/js/Pages/Admin/Index.jsx`
- Modify: `resources/css/app.css` (add admin panel styles)

**Interfaces:**
- Consumes: Inertia props from `AdminController@index`:
  - `roles`: array of role objects with `id, name, display_name, description, allowed_customers, is_system, page_ids, page_slugs, user_count`
  - `pages`: array of page objects with `id, slug, label`
  - `users`: object with `data` (array of user objects), `current_page`, `last_page`, `total`
  - `search`: string
  - `currentUserId`: integer
- Produces: Full admin panel UI with 2 tabs, role CRUD modal, user role assignment, user deletion

- [ ] **Step 1: Create `resources/js/Pages/Admin/Index.jsx`**

```jsx
import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '../../Layouts/MainLayout';

export default function AdminIndex() {
    const { roles, pages, users, search: initialSearch, currentUserId } = usePage().props;
    const [activeTab, setActiveTab] = useState('roles');
    const [search, setSearch] = useState(initialSearch || '');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState({ name: '', display_name: '', description: '', allowed_customers: '*', page_ids: [] });
    const [confirmDelete, setConfirmDelete] = useState(null);
    const flash = usePage().props.flash || {};

    // --- Role Tab ---
    const openCreateRole = () => {
        setEditingRole(null);
        setRoleForm({ name: '', display_name: '', description: '', allowed_customers: '*', page_ids: [] });
        setShowRoleModal(true);
    };

    const openEditRole = (role) => {
        setEditingRole(role);
        const custStr = Array.isArray(role.allowed_customers)
            ? (role.allowed_customers.includes('*') ? '*' : role.allowed_customers.join(', '))
            : '*';
        setRoleForm({
            name: role.name,
            display_name: role.display_name || '',
            description: role.description || '',
            allowed_customers: custStr,
            page_ids: role.page_ids || [],
        });
        setShowRoleModal(true);
    };

    const handleRoleSubmit = (e) => {
        e.preventDefault();
        if (editingRole) {
            router.put(`/admin/roles/${editingRole.id}`, roleForm, {
                preserveScroll: true,
                onSuccess: () => setShowRoleModal(false),
            });
        } else {
            router.post('/admin/roles', roleForm, {
                preserveScroll: true,
                onSuccess: () => setShowRoleModal(false),
            });
        }
    };

    const handleDeleteRole = (roleId) => {
        router.delete(`/admin/roles/${roleId}`, { preserveScroll: true });
        setConfirmDelete(null);
    };

    const togglePageId = (pageId) => {
        setRoleForm(prev => ({
            ...prev,
            page_ids: prev.page_ids.includes(pageId)
                ? prev.page_ids.filter(id => id !== pageId)
                : [...prev.page_ids, pageId],
        }));
    };

    // --- User Tab ---
    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin', { search }, { preserveState: true, preserveScroll: true });
    };

    const handleUserRoleChange = (userId, roleId) => {
        router.put(`/admin/users/${userId}/role`, { role_id: parseInt(roleId) }, { preserveScroll: true });
    };

    const handleDeleteUser = (userId) => {
        router.delete(`/admin/users/${userId}`, { preserveScroll: true });
        setConfirmDelete(null);
    };

    const goToPage = (page) => {
        router.get('/admin', { search, page }, { preserveState: true, preserveScroll: true });
    };

    // --- Role badge colors ---
    const roleBadgeClass = (roleName) => {
        const map = { admin: 'badge-red', viewer: 'badge-blue', guest: 'badge-gray' };
        return map[roleName] || 'badge-purple';
    };

    return (
        <MainLayout>
            <Head title="Quản lý phân quyền" />
            <div className="admin-page">
                <div className="admin-header">
                    <h1>Quản lý phân quyền</h1>
                    <p className="admin-subtitle">Quản lý roles và phân quyền cho người dùng</p>
                </div>

                {/* Flash messages */}
                {flash.success && <div className="flash-success">{flash.success}</div>}
                {flash.error && <div className="flash-error">{flash.error}</div>}

                {/* Tabs */}
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('roles')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Quản lý Roles
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Quản lý Users
                    </button>
                </div>

                {/* Roles Tab */}
                {activeTab === 'roles' && (
                    <div className="admin-section">
                        <div className="section-toolbar">
                            <h2>Danh sách Roles ({roles.length})</h2>
                            <button className="btn-primary" onClick={openCreateRole}>
                                + Thêm Role
                            </button>
                        </div>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Tên</th>
                                        <th>Hiển thị</th>
                                        <th>Mô tả</th>
                                        <th>Customers</th>
                                        <th>Trang</th>
                                        <th>Users</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map(role => (
                                        <tr key={role.id}>
                                            <td>
                                                <span className={`badge ${roleBadgeClass(role.name)}`}>{role.name}</span>
                                                {role.is_system && <span className="badge badge-system">hệ thống</span>}
                                            </td>
                                            <td>{role.display_name || '—'}</td>
                                            <td className="td-desc">{role.description || '—'}</td>
                                            <td>
                                                {role.allowed_customers?.includes('*')
                                                    ? <span className="badge badge-green">Tất cả</span>
                                                    : role.allowed_customers?.length > 0
                                                        ? role.allowed_customers.join(', ')
                                                        : <span className="text-muted">Không có</span>}
                                            </td>
                                            <td>{role.page_slugs?.join(', ') || <span className="text-muted">Không có</span>}</td>
                                            <td>{role.user_count}</td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="btn-icon btn-edit" onClick={() => openEditRole(role)} title="Sửa">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    {!role.is_system && (
                                                        <button className="btn-icon btn-delete" onClick={() => setConfirmDelete({ type: 'role', id: role.id, name: role.name })} title="Xóa">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="admin-section">
                        <div className="section-toolbar">
                            <h2>Danh sách Users ({users.total})</h2>
                            <form onSubmit={handleSearch} className="search-form">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Tìm kiếm theo tên hoặc email..."
                                    className="search-input"
                                />
                                <button type="submit" className="btn-primary">Tìm</button>
                            </form>
                        </div>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Tên</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Đăng nhập cuối</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.data.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt="" className="user-avatar-sm" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="user-avatar-sm-placeholder">
                                                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{user.name}</td>
                                            <td className="td-email">{user.email}</td>
                                            <td>
                                                {user.id === currentUserId ? (
                                                    <span className={`badge ${roleBadgeClass(user.role_name)}`}>
                                                        {user.role_display_name || user.role_name || 'guest'}
                                                        <span className="badge-you">(bạn)</span>
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={user.role_id || ''}
                                                        onChange={e => handleUserRoleChange(user.id, e.target.value)}
                                                        className="role-select"
                                                    >
                                                        <option value="" disabled>Chọn role</option>
                                                        {roles.map(r => (
                                                            <option key={r.id} value={r.id}>{r.display_name || r.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                            <td className="td-date">{user.last_login_at || '—'}</td>
                                            <td>
                                                {user.id !== currentUserId && user.email !== 'minhducqwe0123@gmail.com' && (
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => setConfirmDelete({ type: 'user', id: user.id, name: user.email })}
                                                        title="Xóa user"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {users.last_page > 1 && (
                            <div className="pagination">
                                {Array.from({ length: users.last_page }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        className={`page-btn ${p === users.current_page ? 'active' : ''}`}
                                        onClick={() => goToPage(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Role Modal */}
                {showRoleModal && (
                    <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h3>{editingRole ? `Sửa Role: ${editingRole.name}` : 'Thêm Role mới'}</h3>
                            <form onSubmit={handleRoleSubmit}>
                                {!editingRole && (
                                    <div className="form-group">
                                        <label>Tên role (slug)</label>
                                        <input
                                            type="text"
                                            value={roleForm.name}
                                            onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                            placeholder="vd: viewer_sg432"
                                            pattern="^[a-z0-9_-]+$"
                                            required
                                            className="form-input"
                                        />
                                        <small>Chỉ chữ thường, số, dấu gạch ngang, gạch dưới</small>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Tên hiển thị</label>
                                    <input
                                        type="text"
                                        value={roleForm.display_name}
                                        onChange={e => setRoleForm({ ...roleForm, display_name: e.target.value })}
                                        placeholder="vd: Người xem SG432"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mô tả</label>
                                    <textarea
                                        value={roleForm.description}
                                        onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                                        placeholder="Mô tả ngắn về role này..."
                                        className="form-input"
                                        rows={2}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Allowed Customers</label>
                                    <input
                                        type="text"
                                        value={roleForm.allowed_customers}
                                        onChange={e => setRoleForm({ ...roleForm, allowed_customers: e.target.value })}
                                        placeholder="* (tất cả) hoặc sg432, sg123"
                                        className="form-input"
                                        required
                                    />
                                    <small>Nhập <code>*</code> để cho phép xem tất cả. Nhiều customer cách nhau bằng dấu phẩy. Để trống = không cho phép xem.</small>
                                </div>
                                <div className="form-group">
                                    <label>Trang được truy cập</label>
                                    <div className="checkbox-group">
                                        {pages.map(page => (
                                            <label key={page.id} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={roleForm.page_ids.includes(page.id)}
                                                    onChange={() => togglePageId(page.id)}
                                                    disabled={editingRole?.is_system && editingRole?.name === 'admin' && page.slug === 'admin-panel'}
                                                />
                                                {page.label} <span className="text-muted">({page.slug})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowRoleModal(false)}>Hủy</button>
                                    <button type="submit" className="btn-primary">{editingRole ? 'Cập nhật' : 'Tạo mới'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Confirm Delete Dialog */}
                {confirmDelete && (
                    <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                        <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                            <h3>Xác nhận xóa</h3>
                            <p>Bạn có chắc muốn xóa <strong>{confirmDelete.name}</strong>?</p>
                            {confirmDelete.type === 'role' && (
                                <p className="text-muted">Tất cả users có role này sẽ được chuyển về role "guest".</p>
                            )}
                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Hủy</button>
                                <button
                                    className="btn-danger"
                                    onClick={() => confirmDelete.type === 'role'
                                        ? handleDeleteRole(confirmDelete.id)
                                        : handleDeleteUser(confirmDelete.id)
                                    }
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
```

- [ ] **Step 2: Add admin panel CSS to `resources/css/app.css`**

Append the following CSS at the end of `resources/css/app.css`:

```css
/* ========== ADMIN PANEL ========== */
.admin-page {
    padding: 24px 32px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

.admin-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 4px;
}

.admin-subtitle {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: 20px;
}

/* Flash messages */
.flash-success,
.flash-error {
    padding: 10px 16px;
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    font-size: 0.875rem;
    font-weight: 500;
    animation: flashIn 0.3s ease;
}
.flash-success {
    background: rgba(52, 211, 153, 0.15);
    color: var(--green);
    border: 1px solid rgba(52, 211, 153, 0.3);
}
.flash-error {
    background: rgba(248, 113, 113, 0.15);
    color: var(--red);
    border: 1px solid rgba(248, 113, 113, 0.3);
}
@keyframes flashIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Tabs */
.admin-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: 4px;
    border: 1px solid var(--border-color);
}
.admin-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
}
.admin-tab:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
}
.admin-tab.active {
    background: var(--accent);
    color: #fff;
    box-shadow: var(--shadow-sm);
}

/* Section toolbar */
.section-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
}
.section-toolbar h2 {
    font-size: 1.1rem;
    font-weight: 600;
}

/* Table */
.admin-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
}
.admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}
.admin-table th {
    text-align: left;
    padding: 10px 14px;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
}
.admin-table td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
}
.admin-table tr:last-child td {
    border-bottom: none;
}
.admin-table tr:hover td {
    background: var(--bg-hover);
}
.td-desc {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.td-email {
    font-family: monospace;
    font-size: 0.8rem;
}
.td-date {
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: 0.8rem;
}

/* Badges */
.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-right: 4px;
}
.badge-red { background: rgba(248, 113, 113, 0.2); color: var(--red); }
.badge-blue { background: rgba(99, 102, 241, 0.2); color: var(--accent); }
.badge-gray { background: rgba(107, 114, 128, 0.2); color: var(--text-muted); }
.badge-green { background: rgba(52, 211, 153, 0.2); color: var(--green); }
.badge-purple { background: rgba(167, 139, 250, 0.2); color: var(--gradient-end); }
.badge-system { background: rgba(251, 191, 36, 0.2); color: var(--yellow); font-size: 0.65rem; }
.badge-you { font-weight: 400; margin-left: 4px; opacity: 0.7; }

/* Action buttons */
.action-btns {
    display: flex;
    gap: 6px;
}
.btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
}
.btn-icon:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-glow);
}
.btn-delete:hover {
    border-color: var(--red);
    color: var(--red);
    background: rgba(248, 113, 113, 0.1);
}

/* Buttons */
.btn-primary {
    padding: 8px 16px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-primary:hover {
    background: var(--accent-hover);
    box-shadow: var(--shadow-sm);
}
.btn-secondary {
    padding: 8px 16px;
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-secondary:hover {
    background: var(--bg-hover);
}
.btn-danger {
    padding: 8px 16px;
    background: var(--red);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-danger:hover {
    opacity: 0.9;
    box-shadow: var(--shadow-sm);
}

/* Search */
.search-form {
    display: flex;
    gap: 8px;
}
.search-input {
    padding: 8px 14px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.85rem;
    width: 260px;
    transition: border-color 0.2s;
}
.search-input:focus {
    outline: none;
    border-color: var(--border-focus);
}

/* Role select dropdown */
.role-select {
    padding: 5px 10px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.2s;
}
.role-select:focus {
    outline: none;
    border-color: var(--border-focus);
}

/* User avatar small */
.user-avatar-sm {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
}
.user-avatar-sm-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent-glow);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8rem;
}

/* Pagination */
.pagination {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin-top: 16px;
}
.page-btn {
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
}
.page-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}
.page-btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
}
.modal-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 24px;
    width: 90%;
    max-width: 520px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.3s ease;
}
.modal-sm {
    max-width: 380px;
}
.modal-content h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 16px;
}
.modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Form */
.form-group {
    margin-bottom: 14px;
}
.form-group label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
}
.form-group small {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 4px;
}
.form-group small code {
    background: var(--bg-hover);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.75rem;
}
.form-input {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.85rem;
    transition: border-color 0.2s;
    font-family: inherit;
}
.form-input:focus {
    outline: none;
    border-color: var(--border-focus);
}
.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
}
.checkbox-label:hover {
    background: var(--bg-hover);
}
.checkbox-label input[type="checkbox"] {
    accent-color: var(--accent);
    width: 16px;
    height: 16px;
}
.text-muted {
    color: var(--text-muted);
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Admin/Index.jsx resources/css/app.css
git commit -m "feat: admin panel UI with roles management and users management tabs"
```

---

### Task 9: Cleanup and Final Integration

Remove the old hardcoded config file, share flash messages via Inertia, and verify the full system.

**Files:**
- Delete: `config/auth_roles.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php` (share flash messages)

**Interfaces:**
- Consumes: All changes from Tasks 1-8
- Produces: Fully functional dynamic RBAC system

- [ ] **Step 1: Share flash messages in HandleInertiaRequests**

Update `app/Http/Middleware/HandleInertiaRequests.php` to include flash messages:

```php
public function share(Request $request): array
{
    $authUser = $request->session()->get('auth_user');

    return [
        ...parent::share($request),
        'auth' => [
            'user' => $authUser ? [
                'user_id' => $authUser['user_id'] ?? null,
                'name' => $authUser['name'] ?? null,
                'email' => $authUser['email'] ?? null,
                'avatar' => $authUser['avatar'] ?? null,
                'role' => $authUser['role'] ?? null,
                'allowed_pages' => $authUser['allowed_pages'] ?? [],
            ] : null,
        ],
        'flash' => [
            'success' => $request->session()->get('success'),
            'error' => $request->session()->get('error'),
        ],
    ];
}
```

- [ ] **Step 2: Delete `config/auth_roles.php`**

```bash
Remove-Item -Path "config/auth_roles.php" -Force
```

- [ ] **Step 3: Run full migration with seed**

Run: `php artisan migrate:fresh --seed`

Expected: All tables created, 3 roles + 4 pages seeded, admin user created.

- [ ] **Step 4: Verify ads model still uses MySQL**

Run: `php artisan tinker --execute="echo App\Models\ads::getConnectionName();"`

Expected: `mysql`

- [ ] **Step 5: Start dev server and verify**

Run: `php artisan serve`

Manual verification checklist:
1. Visit `http://localhost:8000/login` → Login page appears
2. Login with admin email → redirected to `/report` → report data loads from MySQL
3. Sidebar shows all menu items including "Quản lý"
4. Visit `/admin` → admin panel loads with 2 tabs
5. Roles tab shows 3 seeded roles with correct pages and customers
6. Users tab shows the admin user
7. Create a new role with limited customers and pages → success flash
8. Login with a different Google account → gets guest role → redirected to /unauthorized

- [ ] **Step 6: Commit and finalize**

```bash
git add -A
git commit -m "feat: complete dynamic RBAC system - remove hardcoded config, add flash messages"
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|---|---|
| SQLite as default DB, MySQL as secondary | Task 1 |
| 5 tables: users, roles, user_roles, pages, role_pages | Task 2 |
| Eloquent models with relationships | Task 2 |
| Seed 3 roles, 4 pages, role-page mappings, admin user | Task 3 |
| Google login upserts to SQLite, resolves from DB | Task 4 |
| Middleware refreshes permissions from DB each request | Task 5 |
| Page-based access control (allowed_pages) | Task 5 |
| Sidebar driven by allowed_pages | Task 6 |
| Admin panel: roles CRUD with allowed_customers + allowed_pages | Tasks 7, 8 |
| Admin panel: users list with search, pagination, role assign, delete | Tasks 7, 8 |
| Self-protection (can't delete self, can't change own role) | Task 7 |
| System roles can't be deleted | Task 7 |
| Admin role always has admin-panel page | Task 7 |
| Flash messages | Task 9 |
| Remove `config/auth_roles.php` | Task 9 |
| Dark/light mode support for admin panel | Task 8 (uses CSS vars) |
