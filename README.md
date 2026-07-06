# BaoCaoQC - Báo Cáo Chạy Quảng Cáo 📊

BaoCaoQC là một hệ thống web nội bộ (Dashboard) được xây dựng bằng **Laravel** và **React (Inertia.js)**, cung cấp giao diện trực quan để xem và phân tích hiệu quả chạy quảng cáo. Hệ thống kết hợp với **DBT (Data Build Tool)** để xử lý và chuẩn hóa dữ liệu từ cơ sở dữ liệu gốc (MySQL).

## 🚀 Tính năng chính

- **Báo cáo Chiến dịch (Report):** Xem tổng hợp các chỉ số quan trọng (Cost, Clicks, Impressions, Installs, CPI, CTR, CPM...) theo nguồn chạy quảng cáo (Source) và theo từng tựa game (Customer). Tích hợp nút Toggle chuyển đổi chế độ **nhóm dữ liệu (Group By)** linh hoạt giữa **Source** và **OS**.
- **So sánh Hiệu quả (Compare):** So sánh trực quan dữ liệu quảng cáo giữa nhiều tập dữ liệu khác nhau trên biểu đồ Chart.js.
- **Top Chiến dịch (Top QC):** 
  - Xem bảng xếp hạng top chiến dịch có chi phí chạy cao nhất.
  - Hỗ trợ xem Top 10, Top 100, Top 1000.
  - Sắp xếp và phân trang dễ sử dụng.
- **Tính năng Lọc mạnh mẽ:** 
  - Lọc theo Khoảng thời gian, Nguồn (Channel), Khách hàng (Customer), và đơn vị Tiền tệ (VND/USD).
  - Modal lọc nâng cao hỗ trợ lọc chi tiết theo Source, Region, OS, Format, Type.
  - **Lọc thông minh:** Các danh sách lựa chọn (Customer, Source, Region, OS...) tự động chỉ hiển thị các giá trị có phát sinh dữ liệu thực tế trong khoảng thời gian được chọn.
- **Xuất Excel:** Dễ dàng tải xuống dữ liệu báo cáo ra file Excel siêu tốc ngay trên trình duyệt (sử dụng thư viện SheetJS).
- **Giao diện Modern & Dark Mode:** Hỗ trợ Dark/Light mode, giao diện bảng căn chỉnh tự động, trải nghiệm người dùng tối ưu.

---

## 🛠 Công nghệ sử dụng

- **Backend:** Laravel 11, PHP 8.2+
- **Frontend:** React 19, Inertia.js, Vite
- **CSS:** Vanilla CSS với biến môi trường (CSS Variables) linh hoạt.
- **Database:** MySQL
- **Data Transformation:** DBT (Data Build Tool) - dbt-mysql
- **Thư viện nổi bật:** 
  - `chart.js` & `react-chartjs-2`: Vẽ biểu đồ.
  - `xlsx` (SheetJS): Xuất file Excel phía client.

---

## 📂 Cấu trúc dự án

```text
\BaoCaoQC
├── app/                  # Logic Backend (Controllers, Models)
│   ├── Http/Controllers/ # ReportController, CompareController, TopCampaignController
│   └── Models/           # Model kết nối với bảng ads (split_campaigns__dbt_tmp)
├── resources/
│   ├── css/              # Chứa file giao diện chính app.css
│   ├── js/
│   │   ├── Components/   # Các Component dùng chung (UI, Sidebar)
│   │   ├── Pages/        # Chứa giao diện các trang (Report, Compare, TopCampaign)
│   │   └── utils/        # Hàm tiện ích (exportExcel.js)
│   └── views/            # File blade mặc định app.blade.php
├── routes/               # Cấu hình routes web.php
└── package.json          # Dependencies cho Frontend
```

---

## 🔄 Luồng xử lý Dữ liệu (DBT)

Dữ liệu thô ban đầu có trường `campaign_name` chứa nhiều thông tin hỗn hợp (như hệ điều hành, format quảng cáo, khu vực, mã game...).
Chúng tôi sử dụng **DBT Model (`split_campaign.sql`)** kết hợp Regex (`REGEXP_SUBSTR`) để tách chuỗi thành các trường dữ liệu rời:
- `game_name` (Ví dụ: sg293, sg310...)
- `os` (ios, and)
- `region` (vn, thai, indo...)
- `fomat` (searchresult, productpage, discovery...)
- `type` (topkwdoithu, landing...)

Mô hình DBT này xuất ra bảng View/Table mới tên là `split_campaigns__dbt_tmp` trên MySQL, và Laravel sẽ đọc dữ liệu trực tiếp từ bảng này thông qua Model `ads`.

---

## ⚙️ Hướng dẫn Cài đặt & Chạy Local

### 1. Yêu cầu hệ thống
- PHP >= 8.2 & Composer
- Node.js >= 18 & NPM
- MySQL
- Python & dbt-core, dbt-mysql (nếu cần chạy DBT)

### 2. Cài đặt Laravel & Frontend

```bash
# Clone project
# cd BaoCaoQC

# Cài đặt PHP packages
composer install

# Cài đặt JS packages
npm install

# Copy file .env và cấu hình Database
cp .env.example .env
php artisan key:generate
```

### 3. Chạy Server phát triển

Khởi chạy cả backend và frontend đồng thời ở 2 terminal:

**Terminal 1 (Backend Laravel):**
```bash
php artisan serve
```

**Terminal 2 (Frontend Vite):**
```bash
npm run dev
```

Truy cập ứng dụng tại địa chỉ: `http://localhost:8000`

---

## 📝 Tác giả
Được xây dựng phục vụ nội bộ cho SohaGame.
