# Implementation Plan: Top QC Page + Excel Export + CSS Formatting

## Mô tả

Tạo page "Top QC" hiển thị top campaign theo chi phí (mặc định), với filter bar tương tự Report, bảng xếp hạng có phân trang, và chức năng xuất Excel. Đồng thời cải thiện định dạng CSS cho cả Report lẫn Top QC.

## Proposed Changes

---

### 1. Backend — Controller

#### [NEW] [TopCampaignController.php](file:///D:/laravel/BaoCaoQC/app/Http/Controllers/TopCampaignController.php)

- Nhận params: `customer_name`, `sources[]`, `date_from` (mặc định 7 ngày trước), `date_to` (hôm nay), `currency`, `top_limit` (10/100/1000)
- Query model `ads` → group by `campaign_name` → SUM(impressions, clicks, installs, cost)
- Tính CTR, CTI, CPI, CPM trên dữ liệu đã gộp
- Mỗi row giữ lại `source` (lấy GROUP_CONCAT hoặc giá trị đầu tiên) và `os`
- Trả về Inertia render `TopCampaign/Index`

Dữ liệu trả về cho frontend:
```php
[
    'topData' => [...],         // Mảng campaign đã sort + limit
    'dateFrom' => '...',
    'dateTo' => '...',
    'currency' => 'vnd',
    'customerNames' => [...],
    'selectedCustomer' => '...',
    'allSources' => [...],
    'selectedSources' => [...],
    'topLimit' => 10,
]
```

---

### 2. Routes

#### [MODIFY] [web.php](file:///D:/laravel/BaoCaoQC/routes/web.php)

Thêm:
```php
use App\Http\Controllers\TopCampaignController;
Route::get('/top-campaign', [TopCampaignController::class, 'index'])->name('top.index');
```

---

### 3. Frontend — Page Top QC

#### [NEW] [Index.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Pages/TopCampaign/Index.jsx)

- Layout giống Report nhưng **không có stat-bar**
- Header: "🏆 Top Chiến dịch Quảng cáo"
- FilterBar → TopTable → Record count
- State: `visibleColumns` mặc định = `['cost', 'impressions', 'clicks', 'installs', 'cpi']` (5 cột chính)
- Các cột ẩn: `ctr`, `cti`, `cpm` — dùng filter "Hiển thị cột" để bật

#### [NEW] [FilterBar.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Pages/TopCampaign/FilterBar.jsx)

Giữ nguyên từ Report + thêm:

| Thành phần mới | Mô tả |
|---|---|
| **Nút Top** | Dropdown select: 10 / 100 / 1000 — thay đổi `top_limit` param |
| **Nút Xuất Excel** | Button gọi hàm export, tên file: `Top{limit}_{customer}_{source}_{dateFrom}-{dateTo}.xlsx` |

- Cột cho "Hiển thị cột": `campaign_name`, `source`, `os`, `cost`, `impressions`, `clicks`, `installs`, `cpi`, `ctr`, `cti`, `cpm`
- Mặc định hiển thị: `campaign_name`, `source`, `os`, `cost`, `impressions`, `clicks`, `installs`, `cpi`

#### [NEW] [TopTable.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Pages/TopCampaign/TopTable.jsx)

| Cột | Label | Type | Mặc định hiển thị |
|-----|-------|------|-------------------|
| stt | STT | number (auto) | ✅ luôn hiện |
| campaign_name | Ad Name | string | ✅ |
| source | Channel | string | ✅ |
| os | OS | string | ✅ |
| cost | Cost | number | ✅ |
| impressions | Impressions | number | ✅ |
| clicks | Clicks | number | ✅ |
| installs | Installs | number | ✅ |
| cpi | CPI | number | ✅ |
| ctr | CTR | number | ❌ ẩn |
| cti | CTI | number | ❌ ẩn |
| cpm | CPM | number | ❌ ẩn |

**Sorting:**
- Mặc định: `cost` giảm dần (desc)
- Click header → sort theo cột đó (desc)
- Click lại cùng cột → đảo chiều (asc ↔ desc)
- STT luôn tính theo thứ tự hiện tại

**Phân trang:**
- 10 bản ghi/trang
- Navigation: Prev / Page numbers / Next
- Summary row ở cuối (tổng tất cả data, không chỉ trang hiện tại)

---

### 4. Sidebar

#### [MODIFY] [Sidebar.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Components/Sidebar/Sidebar.jsx)

Thêm link "Top QC" với icon 🏆 giữa "Báo cáo" và "So sánh"

---

### 5. Excel Export (Client-side SheetJS)

#### Cài đặt dependency
```bash
npm install xlsx
```

#### [NEW] [exportExcel.js](file:///D:/laravel/BaoCaoQC/resources/js/utils/exportExcel.js)

Hàm tiện ích dùng chung cho cả Report + Top QC:
```js
export function exportToExcel(data, columns, filename) {
    // Dùng XLSX.utils.json_to_sheet → XLSX.writeFile
    // Format: header từ columns labels, data theo columns keys
}
```

**Tên file format:**
- Top QC: `Top{limit}_{customer}_{source}_{dateRange}.xlsx`
  - VD: `Top10_TatCa_TatCa_2026-06-25_2026-07-01.xlsx`
- Report: `Report_{customer}_{source}_{dateRange}.xlsx`

#### [MODIFY] [Report/FilterBar.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Pages/Report/FilterBar.jsx)

Thêm nút "Xuất Excel" vào filter bar (trước nút Clear)

#### [MODIFY] [Report/Index.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Pages/Report/Index.jsx)

Truyền thêm props cho FilterBar: `reportData`, `currency` để xuất Excel

---

### 6. CSS Formatting

#### [MODIFY] [app.css](file:///D:/laravel/BaoCaoQC/resources/css/app.css)

**Thay đổi định dạng bảng (áp dụng Report + Top QC):**

```css
/* Số: căn giữa — Thay từ text-align: right */
.table-container th, .table-container td {
    text-align: center;  /* Mặc định căn giữa cho số */
}

/* Cột chữ (name, source): căn trái */
.table-container td.col-text,
.table-container th.col-text {
    text-align: left;
}

/* Cột name co giãn hợp lý */
.col-campaign_name {
    min-width: 200px;
    max-width: 400px;
    white-space: normal;     /* Cho phép wrap */
    word-break: break-word;
}
```

**Filter bar responsive:**
```css
.filter-bar {
    flex-wrap: wrap;         /* Đã có */
}
.filter-select {
    min-width: 120px;
    max-width: 250px;        /* Giới hạn max */
}
/* Text dài ngắt dòng trái */
.filter-select option {
    text-align: left;
    white-space: normal;
}
```

**Pagination styles:**
```css
.pagination { ... }         /* Flexbox navigation */
.pagination-btn { ... }     /* Prev/Next buttons */
.pagination-page { ... }    /* Page numbers */
.pagination-page.active { ... }
```

**Export button styles:**
```css
.btn-export { ... }         /* Green accent button */
```

---

### 7. Cập nhật Report DataTable formatting

#### [MODIFY] [Report/DataTable.jsx](file:///D:/laravel/BaoCaoQC/resources/js/Pages/Report/DataTable.jsx)

- Thêm class `col-text` cho cột source (căn trái)
- Các cột số giữ class mặc định (căn giữa theo CSS mới)

---

## Tóm tắt Files

| File | Action | Mô tả |
|------|--------|-------|
| `TopCampaignController.php` | NEW | Backend controller |
| `web.php` | MODIFY | Thêm route |
| `Pages/TopCampaign/Index.jsx` | NEW | Page chính |
| `Pages/TopCampaign/FilterBar.jsx` | NEW | Filter bar + Top selector + Export |
| `Pages/TopCampaign/TopTable.jsx` | NEW | Bảng xếp hạng + phân trang |
| `utils/exportExcel.js` | NEW | Hàm xuất Excel dùng chung |
| `Sidebar.jsx` | MODIFY | Thêm nav link |
| `Report/FilterBar.jsx` | MODIFY | Thêm nút Export |
| `Report/Index.jsx` | MODIFY | Truyền data cho Export |
| `Report/DataTable.jsx` | MODIFY | Cải thiện CSS class |
| `app.css` | MODIFY | Định dạng bảng + pagination + export |

## Verification Plan

### Manual Verification
- Truy cập `/top-campaign` → kiểm tra filter, sorting, pagination
- Click các header cột → kiểm tra sắp xếp + đảo chiều
- Thay đổi Top limit (10/100/1000) → kiểm tra số lượng hiển thị
- Xuất Excel ở cả Top QC và Report → kiểm tra tên file + nội dung
- Kiểm tra responsive filter bar khi thu nhỏ cửa sổ
- Kiểm tra căn chỉnh: số căn giữa, chữ căn trái
