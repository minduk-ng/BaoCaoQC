# Dynamic Role-Based Access Control (RBAC) Design

## Tổng quan

Chuyển đổi hệ thống phân quyền từ hardcode trong `config/auth_roles.php` sang phân quyền động lưu trong SQLite database. Sử dụng SQLite làm database mặc định cho tất cả dữ liệu hệ thống (users, roles, pages), giữ MySQL hiện tại (`172.16.11.13`) làm kết nối phụ chỉ đọc cho dữ liệu ads.

## Yêu cầu

### Chức năng
- Lưu thông tin user sau khi đăng nhập Google vào SQLite
- Quản lý roles động: tạo/sửa/xóa roles qua UI
- Mỗi role có `allowed_customers` (danh sách customer_name được xem dữ liệu)
- Mỗi role có `allowed_pages` (những trang nào role đó được truy cập)
- Trang Admin Panel với 2 tab: Quản lý Roles và Quản lý Users
- Tìm kiếm/lọc user theo email hoặc tên
- Phân trang danh sách users
- Xóa user khỏi hệ thống
- Hiển thị lần đăng nhập cuối của user
- Seed mặc định 3 roles + 4 pages + admin user ban đầu

### Phi chức năng
- Không ảnh hưởng đến kết nối MySQL chỉ đọc (ads data)
- Tương thích với hệ thống Google OAuth hiện tại
- Admin Panel hỗ trợ dark/light mode (theo hệ thống CSS hiện tại)
- Migration từ config cũ sang DB mới phải mượt mà (không downtime)

---

## Kiến trúc Database

### Dual Database Setup

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  SQLite (default connection)    │     │  MySQL (mysql connection)       │
│  database/database.sqlite       │     │  172.16.11.13 (READ-ONLY)      │
│                                 │     │                                 │
│  - users                        │     │  - split_campaigns_6__dbt_tmp   │
│  - roles                        │     │    (ads data)                   │
│  - user_roles                   │     │                                 │
│  - pages                        │     │                                 │
│  - role_pages                   │     │                                 │
│  - sessions                     │     │                                 │
│  - cache                        │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

### Cấu hình `.env`

```env
# Default connection → SQLite (writable, local)
DB_CONNECTION=sqlite

# MySQL connection (read-only, ads warehouse)
DB_MYSQL_HOST=172.16.11.13
DB_MYSQL_PORT=3306
DB_MYSQL_DATABASE=sohagame_ads_warehouse
DB_MYSQL_USERNAME=ducnguyenminh
DB_MYSQL_PASSWORD="DucNguyenMinh@2026!"
```

### Cấu hình `config/database.php`

Thay đổi:
- `default` connection → `sqlite`
- Kết nối `mysql` giữ nguyên nhưng đọc từ env vars riêng (`DB_MYSQL_*`)
- Thêm cấu hình `sqlite` path trỏ đến `database/database.sqlite`

---

## Schema chi tiết

### Bảng 1: `users`

Lưu thông tin người dùng sau khi đăng nhập Google. Mỗi email là duy nhất.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(255) | NOT NULL | Tên từ Google |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email Google |
| `avatar` | VARCHAR(500) | NULLABLE | URL avatar từ Google |
| `google_id` | VARCHAR(255) | NULLABLE | Google user ID |
| `last_login_at` | TIMESTAMP | NULLABLE | Lần đăng nhập cuối |
| `created_at` | TIMESTAMP | | |
| `updated_at` | TIMESTAMP | | |

### Bảng 2: `roles`

Định nghĩa các role trong hệ thống. Mỗi role có `allowed_customers` xác định dữ liệu customer nào role đó được xem.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Tên role (admin, viewer, guest,...) |
| `display_name` | VARCHAR(255) | NULLABLE | Tên hiển thị (Quản trị viên, Người xem,...) |
| `description` | TEXT | NULLABLE | Mô tả role |
| `allowed_customers` | TEXT (JSON) | NOT NULL, DEFAULT '["*"]' | Danh sách customer_name. `["*"]` = tất cả |
| `is_system` | BOOLEAN | NOT NULL, DEFAULT 0 | Role hệ thống không thể xóa |
| `created_at` | TIMESTAMP | | |
| `updated_at` | TIMESTAMP | | |

**Quy tắc `allowed_customers`:**
- `["*"]` — truy cập tất cả customer (mặc định)
- `["sg432"]` — chỉ truy cập customer `sg432`
- `["sg432", "sg123"]` — truy cập nhiều customer
- `[]` — không truy cập dữ liệu nào (dùng cho role `guest`)

### Bảng 3: `user_roles`

Bảng pivot: gán mỗi user vào đúng 1 role. Mỗi user chỉ có 1 role tại một thời điểm.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `user_id` | INTEGER | FK → users.id, UNIQUE | Mỗi user chỉ 1 role |
| `role_id` | INTEGER | FK → roles.id | Role được gán |
| `assigned_by` | INTEGER | FK → users.id, NULLABLE | Admin đã gán role |
| `created_at` | TIMESTAMP | | |
| `updated_at` | TIMESTAMP | | |

**Constraint:** `UNIQUE(user_id)` — đảm bảo mỗi user chỉ có 1 role.

### Bảng 4: `pages`

Danh sách các trang trong hệ thống. Mỗi trang có slug (dùng trong code) và label (hiển thị UI).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE | Định danh trang: `report`, `top-campaign`, `compare`, `admin-panel` |
| `label` | VARCHAR(255) | NOT NULL | Tên hiển thị: "Báo cáo", "Top QC", "So sánh", "Quản lý" |
| `route_name` | VARCHAR(255) | NOT NULL | Laravel route name: `report.index`, `top.index`,... |
| `created_at` | TIMESTAMP | | |
| `updated_at` | TIMESTAMP | | |

### Bảng 5: `role_pages`

Bảng pivot: role nào được truy cập trang nào.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `role_id` | INTEGER | FK → roles.id | |
| `page_id` | INTEGER | FK → pages.id | |
| `created_at` | TIMESTAMP | | |

**Constraint:** `UNIQUE(role_id, page_id)` — mỗi cặp role-page chỉ xuất hiện 1 lần.

---

## Seed dữ liệu mặc định

### Roles

| name | display_name | allowed_customers | is_system |
|------|-------------|-------------------|-----------|
| `admin` | Quản trị viên | `["*"]` | `true` |
| `viewer` | Người xem | `["*"]` | `true` |
| `guest` | Khách | `[]` | `true` |

### Pages

| slug | label | route_name |
|------|-------|------------|
| `report` | Báo cáo | `report.index` |
| `top-campaign` | Top QC | `top.index` |
| `compare` | So sánh | `compare.index` |
| `admin-panel` | Quản lý phân quyền | `admin.index` |

### Role-Pages mapping

| role | pages |
|------|-------|
| `admin` | report, top-campaign, compare, admin-panel |
| `viewer` | report, top-campaign |
| `guest` | (không có trang nào) |

### Default admin user

Khi chạy seeder, tự động tạo user `minhducqwe0123@gmail.com` và gán role `admin`.

---

## Luồng hoạt động (Updated)

### Đăng nhập Google (Updated Flow)

```
1. User click "Đăng nhập bằng Google"
2. Google OAuth callback → GoogleAuthController::handleCallback()
3. Lấy info từ Google: name, email, avatar, google_id
4. Upsert vào bảng `users` (SQLite):
   - Nếu email đã tồn tại → cập nhật name, avatar, last_login_at
   - Nếu email mới → tạo mới user
5. Tra cứu role:
   - Query user_roles → lấy role_id
   - Nếu user chưa có role → gán role 'guest' mặc định
   - Load role info: name, allowed_customers
6. Tra cứu allowed_pages:
   - Query role_pages JOIN pages → lấy danh sách page slugs
7. Lưu vào session:
   {
     name, email, avatar, role,
     allowed_customers: ["*"] hoặc ["sg432",...],
     allowed_pages: ["report", "top-campaign",...]
   }
8. Redirect:
   - Nếu allowed_pages rỗng (guest) → /unauthorized
   - Ngược lại → /report (hoặc trang đầu tiên trong allowed_pages)
```

### Kiểm tra quyền mỗi request (Updated)

```
1. CheckAuth middleware: session có user? Không → /login
2. CheckRole middleware (updated):
   - Đọc allowed_pages từ session
   - So sánh route hiện tại với allowed_pages
   - Nếu route không nằm trong allowed_pages → /unauthorized
3. HandleInertiaRequests: share user info + allowed_pages xuống React
4. React Sidebar: ẩn/hiện menu dựa trên allowed_pages (thay vì hardcode role)
```

### Middleware CheckRole (Updated Logic)

Thay vì nhận tham số `check.role:admin,viewer`, middleware sẽ tra cứu page slug từ route name và so sánh với `allowed_pages` trong session:

```php
// Trước: check.role:admin,viewer (hardcode)
// Sau: check.role (tự động tra cứu page từ route name)

public function handle(Request $request, Closure $next): Response
{
    $user = $request->session()->get('auth_user');
    if (!$user) return redirect('/unauthorized');

    $allowedPages = $user['allowed_pages'] ?? [];

    // Map route name → page slug
    $routeName = $request->route()->getName();
    $pageSlug = $this->routeToPageSlug($routeName);

    if ($pageSlug && !in_array($pageSlug, $allowedPages)) {
        return redirect('/unauthorized');
    }

    return $next($request);
}
```

---

## Admin Panel UI

### Route: `/admin`

Chỉ truy cập được bởi roles có `admin-panel` trong allowed_pages.

### Layout

Sử dụng `MainLayout` (Sidebar + main content) như các trang khác. Thêm menu item "Quản lý" vào Sidebar cho roles có quyền.

### Tab 1: Quản lý Roles

**Danh sách roles:**
- Bảng hiển thị: Tên role | Mô tả | Allowed Customers | Allowed Pages | Hệ thống | Hành động
- Nút "Thêm Role" mở modal/form
- Mỗi row có nút Sửa và Xóa (role hệ thống ẩn nút Xóa)

**Form tạo/sửa role:**
- Input: Tên role (slug), Tên hiển thị, Mô tả
- Input: Allowed Customers — text input, nhập danh sách customer cách nhau bằng dấu phẩy. Nhập `*` để cho phép tất cả. Để trống = không cho phép xem dữ liệu nào
- Checkbox group: Allowed Pages — tick các trang mà role được truy cập (lấy từ bảng `pages`)

### Tab 2: Quản lý Users

**Danh sách users:**
- Thanh tìm kiếm: lọc theo email hoặc tên
- Phân trang (15 users/trang)
- Bảng hiển thị: Avatar | Tên | Email | Role hiện tại | Đăng nhập cuối | Hành động
- Mỗi row:
  - Dropdown chọn role (thay đổi ngay lập tức qua AJAX)
  - Nút Xóa user (có confirm dialog)
- Badge màu cho mỗi role (admin = đỏ, viewer = xanh, guest = xám,...)

**Lưu ý:**
- User đang đăng nhập không thể tự xóa chính mình
- User đang đăng nhập không thể tự đổi role của chính mình
- Khi xóa user → xóa cả user_roles record liên quan

---

## Cấu trúc file thay đổi

### Files mới

| File | Mục đích |
|------|----------|
| `database/database.sqlite` | SQLite database file |
| `database/migrations/xxxx_create_roles_table.php` | Migration bảng roles |
| `database/migrations/xxxx_update_users_table_for_google.php` | Migration cập nhật bảng users |
| `database/migrations/xxxx_create_user_roles_table.php` | Migration bảng user_roles |
| `database/migrations/xxxx_create_pages_table.php` | Migration bảng pages |
| `database/migrations/xxxx_create_role_pages_table.php` | Migration bảng role_pages |
| `database/seeders/RbacSeeder.php` | Seed roles, pages, role_pages, default admin |
| `app/Models/Role.php` | Eloquent model cho roles |
| `app/Models/Page.php` | Eloquent model cho pages |
| `app/Models/UserRole.php` | Eloquent model cho user_roles |
| `app/Http/Controllers/AdminController.php` | Controller cho trang admin panel |
| `resources/js/Pages/Admin/Index.jsx` | React page cho admin panel (2 tabs) |

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `.env` | Đổi `DB_CONNECTION=sqlite`, thêm `DB_MYSQL_*` vars |
| `config/database.php` | Cập nhật connections: sqlite default, mysql secondary |
| `app/Models/ads.php` | Thêm `protected $connection = 'mysql';` |
| `app/Models/User.php` | Thêm relationships (role, userRole), thêm fillable fields |
| `app/Http/Controllers/Auth/GoogleAuthController.php` | Đổi logic từ config → DB query |
| `app/Http/Middleware/CheckRole.php` | Đổi logic từ hardcode roles → allowed_pages session |
| `app/Http/Middleware/HandleInertiaRequests.php` | Share thêm allowed_pages |
| `routes/web.php` | Thêm routes admin panel, bỏ tham số middleware check.role |
| `resources/js/Components/Sidebar/Sidebar.jsx` | Lấy menu items từ allowed_pages thay vì hardcode roles |
| `config/auth_roles.php` | **XÓA** — không cần nữa |

---

## Luồng Migration từ hệ thống cũ

1. Cập nhật `.env`: đổi `DB_CONNECTION=sqlite`, thêm `DB_MYSQL_*`
2. Cập nhật `config/database.php`: thêm kết nối mysql riêng
3. Tạo file `database/database.sqlite` (rỗng)
4. Chạy `php artisan migrate` → tạo tất cả bảng trên SQLite
5. Chạy `php artisan db:seed --class=RbacSeeder` → seed dữ liệu mặc định
6. Cập nhật model `ads.php` → thêm `$connection = 'mysql'`
7. Cập nhật `GoogleAuthController` → đổi logic tra cứu role
8. Cập nhật middleware, routes, Sidebar
9. Xóa `config/auth_roles.php`

---

## Model Relationships

```
User (1) ──── (1) UserRole ──── (N) Role
                                    │
                                    │ (N)
                                    │
                               RolePage ──── (N) Page
```

- `User` hasOne `UserRole` (mỗi user 1 role)
- `Role` hasMany `UserRole` (mỗi role nhiều users)
- `Role` belongsToMany `Page` through `role_pages`
- `Page` belongsToMany `Role` through `role_pages`

---

## API Endpoints (Admin Panel)

| Method | Route | Controller Method | Description |
|--------|-------|-------------------|-------------|
| GET | `/admin` | `AdminController@index` | Render trang admin (Inertia) |
| POST | `/admin/roles` | `AdminController@storeRole` | Tạo role mới |
| PUT | `/admin/roles/{id}` | `AdminController@updateRole` | Cập nhật role |
| DELETE | `/admin/roles/{id}` | `AdminController@deleteRole` | Xóa role |
| PUT | `/admin/users/{id}/role` | `AdminController@updateUserRole` | Gán role cho user |
| DELETE | `/admin/users/{id}` | `AdminController@deleteUser` | Xóa user |

Tất cả routes admin được bảo vệ bởi middleware `check.auth` + `check.role` (kiểm tra user có quyền truy cập page `admin-panel`).

---

## Security Considerations

1. **Role `admin` là system role** — không thể xóa, không thể bỏ page `admin-panel` khỏi role admin
2. **Self-protection** — user không thể xóa chính mình, không thể đổi role của chính mình
3. **Guest mặc định** — user mới đăng nhập lần đầu sẽ nhận role `guest` (không có allowed_pages → redirect /unauthorized)
4. **Backend enforcement** — dù frontend ẩn menu, backend middleware vẫn kiểm tra mỗi request
5. **Allowed customers enforcement** — query filter `whereIn('customer_name', ...)` vẫn được áp dụng ở backend cho mọi data query
6. **Session refresh on role change** — Khi admin thay đổi role của user, session cũ của user đó sẽ không tự cập nhật. Có 2 cách xử lý:
   - **Cách đơn giản (chọn cách này):** Role/permissions được refresh mỗi lần load trang (middleware đọc lại từ DB thay vì chỉ đọc session). Tuy thêm 1-2 queries mỗi request nhưng đảm bảo luôn chính xác.
   - *Cách phức tạp:* Invalidate session của user bị đổi role (cần session driver = database). Không chọn cách này vì hiện tại dùng session driver = file.

---

## Verification Plan

### Automated
- `php artisan migrate:fresh --seed` — đảm bảo migrations và seeders chạy thành công trên SQLite
- `php artisan tinker` — kiểm tra relationships hoạt động đúng
- Truy cập `/report` với ads model → đảm bảo vẫn query MySQL

### Manual
- Đăng nhập Google với email admin → vào được tất cả trang + admin panel
- Đăng nhập với email mới → role guest → redirect /unauthorized
- Admin gán role cho user mới → user đó truy cập được trang tương ứng
- Admin tạo role mới với allowed_customers giới hạn → user với role đó chỉ thấy dữ liệu của customer đó
- Admin tạo role mới với chỉ 1 allowed_page → user chỉ thấy menu item đó
- Thử xóa role hệ thống → báo lỗi
- Thử xóa chính mình → báo lỗi
