# Google Authentication & Role-Based Authorization

## Tổng quan

Thêm chức năng đăng nhập bằng Google vào hệ thống BaoCaoQC, sử dụng Laravel Socialite xử lý OAuth ở backend. Thông tin user lưu trong session Laravel, đồng thời share xuống React qua Inertia.js shared data. Phân quyền dựa trên hardcode email → role trong file config PHP (không dùng database).

## Yêu cầu

### Chức năng
- Trang đăng nhập chỉ hiển thị 1 nút "Đăng nhập bằng Google"
- Sau khi đăng nhập, thông tin user (tên, email, avatar) hiển thị ở Sidebar
- Phân quyền theo 3 role: admin, viewer, guest
- Email không có trong danh sách config → tự động gán role "guest"
- Nút đăng xuất ở Sidebar

### Phi chức năng
- Hỗ trợ dark/light mode cho trang Login
- Bảo mật: session-based (không chỉ dựa vào localStorage)
- Dễ mở rộng: khi có DB, chỉ cần đổi nguồn đọc role

## OAuth Credentials

- **Client ID**: `447366707338-g4f4b9hg9r5jcp0huln56k2jp0oiobvq.apps.googleusercontent.com`
- **Project ID**: `baocaoqc`
- **Redirect URI**: `http://localhost:8000/auth/google/callback`

> **QUAN TRỌNG**: Trong Google Console, cần cập nhật:
> - Authorized JavaScript origins: `http://localhost:8000`
> - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`

## Kiến trúc

### Luồng đăng nhập

```
1. User truy cập bất kỳ route → CheckAuth middleware
2. Chưa có session → Redirect /login
3. User click "Đăng nhập bằng Google"
4. GET /auth/google/redirect → Laravel Socialite redirect sang Google
5. Google xác thực → Callback GET /auth/google/callback
6. Socialite lấy user info (name, email, avatar, google_id)
7. Tra cứu email trong config/auth_roles.php → Xác định role
8. Lưu vào session: { name, email, avatar, role }
9. Redirect:
   - admin/viewer → /report
   - guest → /unauthorized
```

### Luồng đăng xuất

```
1. User click "Đăng xuất" trên Sidebar
2. POST /auth/logout (Inertia link)
3. Laravel xóa session
4. Redirect về /login
```

### Luồng kiểm tra quyền mỗi request

```
1. CheckAuth middleware: session có user? Không → /login
2. CheckRole middleware: user.role có trong danh sách allowed roles? Không → /unauthorized
3. HandleInertiaRequests: share user info (name, email, avatar, role) xuống React
4. React Sidebar: ẩn/hiện menu items theo role
```

## Phân quyền chi tiết

### Cấu hình role (`config/auth_roles.php`)

```php
return [
    'roles' => [
        'admin' => [
            // Danh sách email admin
        ],
        'viewer' => [
            // Danh sách email viewer
        ],
    ],
    // Email không thuộc danh sách → role = 'guest'
];
```

### Ma trận quyền

| Chức năng | Route | Admin | Viewer | Guest |
|---|---|---|---|---|
| Xem Report | `/report` | ✅ | ✅ | ❌ |
| Xem Top QC | `/top-campaign` | ✅ | ❌ | ❌ |
| Xem Compare | `/compare` | ✅ | ❌ | ❌ |
| API Compare data | `/api/compare-data` | ✅ | ❌ | ❌ |
| Xem chi tiết customer | (trong Report) | ✅ | ❌ | ❌ |
| Xuất Excel | (trong Report/TopQC) | ✅ | ✅ | ❌ |
| Sidebar menu đầy đủ | — | ✅ | Chỉ Report | Không menu |

### Middleware mapping

```
Route /login, /auth/google/* → Không middleware (public)
Route /unauthorized → CheckAuth only
Route /report → CheckAuth + CheckRole(['admin', 'viewer'])
Route /top-campaign → CheckAuth + CheckRole(['admin'])
Route /compare, /api/compare-data → CheckAuth + CheckRole(['admin'])
```

## Cấu trúc file

### Files mới

| File | Mục đích |
|---|---|
| `config/auth_roles.php` | Hardcode email → role mapping |
| `app/Http/Controllers/Auth/GoogleAuthController.php` | Xử lý OAuth redirect + callback + logout |
| `app/Http/Middleware/CheckAuth.php` | Kiểm tra user đã đăng nhập (có session) |
| `app/Http/Middleware/CheckRole.php` | Kiểm tra role user có trong danh sách allowed |
| `resources/js/Pages/Auth/Login.jsx` | Trang đăng nhập |
| `resources/js/Pages/Auth/Unauthorized.jsx` | Trang thông báo không có quyền |
| `resources/js/Components/Sidebar/UserProfile.jsx` | Component hiển thị user info + logout |

### Files cần sửa

| File | Thay đổi |
|---|---|
| `routes/web.php` | Thêm routes auth, bọc routes hiện tại bằng middleware group |
| `config/services.php` | Thêm config Google OAuth |
| `.env` / `.env.example` | Thêm GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI |
| `app/Http/Middleware/HandleInertiaRequests.php` | Share user data từ session xuống React |
| `resources/js/Components/Sidebar/Sidebar.jsx` | Thêm UserProfile, ẩn menu theo role |
| `resources/js/Layouts/MainLayout.jsx` | Không thay đổi lớn (auth xử lý ở middleware) |
| `README.md` | Thêm mô tả tính năng auth + hướng dẫn cấu hình |

## Thiết kế UI

### Trang Login (`/login`)

- Layout: Fullscreen, centered vertically & horizontally
- Card trung tâm:
  - Logo SOHAGAME (emoji 📊 + text) ở trên
  - Tiêu đề: "Đăng nhập để tiếp tục"
  - Mô tả ngắn: "Sử dụng tài khoản Google để truy cập hệ thống báo cáo"
  - Nút "Đăng nhập bằng Google" với icon Google (SVG)
  - Nút có hover effect, transition mượt
- Hỗ trợ dark/light mode (dùng CSS variables hiện tại)
- Không có sidebar, không có navigation

### Trang Unauthorized (`/unauthorized`)

- Layout: Fullscreen centered (tương tự Login)
- Card thông báo:
  - Icon cảnh báo (🔒 hoặc SVG)
  - Tiêu đề: "Không có quyền truy cập"
  - Thông báo: "Tài khoản [email] không được cấp quyền. Vui lòng liên hệ Admin."
  - Nút "Đăng xuất" để thử tài khoản khác
- Hiển thị email hiện tại đã đăng nhập

### Sidebar (cập nhật)

- Phần dưới cùng sidebar: Component UserProfile
  - Avatar tròn (ảnh từ Google)
  - Tên người dùng
  - Email (text nhỏ, mờ)
  - Nút icon đăng xuất (hover effect)
- Menu items: ẩn theo role
  - Admin: hiển thị tất cả (Báo cáo, Top QC, So sánh)
  - Viewer: chỉ hiển thị "Báo cáo"

## Lưu ý kỹ thuật

1. **Session vs localStorage**: Session là nguồn sự thật duy nhất. React nhận user info qua Inertia shared data (server-rendered). Không cần đọc/ghi localStorage.

2. **Redirect URI**: Google OAuth callback PHẢI trỏ về Laravel server (port 8000). Vite dev server (port 3000) chỉ serve assets, không xử lý HTTP routes.

3. **CSRF Protection**: Route POST `/auth/logout` tự động được bảo vệ bởi Laravel CSRF middleware. Inertia.js tự động gửi CSRF token.

4. **Mở rộng sau này**: Khi muốn chuyển sang DB, chỉ cần:
   - Tạo bảng `users` với cột `role`
   - Đổi logic tra cứu role từ config file sang DB query
   - Không thay đổi middleware hay frontend

5. **Xử lý viewer xem customer**: Viewer chỉ xem Report ở mức tổng (không expand ra customer_name children). Frontend ẩn nút expand khi role = viewer.
