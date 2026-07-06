# Restructure split_campaign View + Stored Procedure cho Grouped Reporting

## Bối cảnh

View `split_campaigns` hiện tại dùng cách tìm kiếm cứng (LOCATE, REGEXP_SUBSTR) để trích xuất `game_name`, `os`, `region`, `fomat`, `type` từ `campaign_name`. Cách này gây lỗi khi token trùng với dữ liệu thực (ví dụ: `SG437_vn_viet_and_inst_ingame_us` → region có 2 giá trị `vn` và `us`).

Giải pháp: chuyển sang **position-based parsing** — tách campaign_name theo vị trí token `_`, kết hợp validation để đảm bảo chính xác.

## Cấu trúc campaign_name

```
SG443_vn_viet_ios_inst_kol_tiktoker_spc
  │     │    │    │    │    │     (bỏ qua)
  T1    T2   T3   T4   T5   T6
  │     │   (bỏ)  │    │    │
game  region      os  fomat type
```

- **Token 1**: `game_name` — dạng `sg[_ ]?[0-9]{3}` (VD: sg443, sg_443, sg 443)
- **Token 2**: `region` — mã khu vực (VD: vn, us, jp)
- **Token 3**: ngôn ngữ — **bỏ qua**
- **Token 4**: `os` — hệ điều hành (VD: ios, and)
- **Token 5**: `fomat` — định dạng quảng cáo (VD: inst, prom)
- **Token 6**: `type` — loại quảng cáo (VD: kol, muc)
- **Token 7+**: **bỏ qua**

## Thay đổi 1: View `split_campaigns`

### Normalize trước, parse sau

1. **LOWER** campaign_name
2. **Normalize** game_name: `REGEXP_REPLACE(cn, 'sg[_ ]([0-9]{3})', 'sg$1')` → gộp `sg_443` / `sg 443` → `sg443`
3. **Parse theo vị trí** trên chuỗi đã normalize bằng `SUBSTRING_INDEX`

### Validation (2 điều kiện, phải thỏa cả 2)

1. Chuỗi đã normalize phải có **≥ 6 token** (đếm `_` + 1)
2. Token 1 phải match pattern `^sg[0-9]{3}$` (dùng `REGEXP_LIKE` trên MySQL 8.0)

→ Không thỏa → tất cả trường parsed (game_name, region, os, fomat, type) = `NULL`

### Extract game_name

Dùng `REGEXP_SUBSTR(cn_gốc, 'sg[_ ]?[0-9]{3}')` từ campaign_name **gốc** (LOWER, chưa normalize) để giữ đúng format ban đầu.

### Extract các trường khác

Trên chuỗi **đã normalize**:
- `region` = token 2: `SUBSTRING_INDEX(SUBSTRING_INDEX(cn_normalized, '_', 2), '_', -1)`
- `os` = token 4: `SUBSTRING_INDEX(SUBSTRING_INDEX(cn_normalized, '_', 4), '_', -1)`
- `fomat` = token 5: `SUBSTRING_INDEX(SUBSTRING_INDEX(cn_normalized, '_', 5), '_', -1)`
- `type` = token 6: `SUBSTRING_INDEX(SUBSTRING_INDEX(cn_normalized, '_', 6), '_', -1)`

### Filter rows

```sql
WHERE clicks > 0 AND impressions > 0 AND installs > 0 AND cost_vnd > 0
```

Tất cả 4 chỉ số phải > 0 (AND). Điều kiện dùng `cost_vnd` vì cost đã được convert — nếu cost_vnd > 0 thì cost_usd cũng > 0.

### Output columns (bỏ computed metrics)

```
date, source, campaign_id, campaign_name, customer_id, customer_name,
game_name, os, region, fomat, type,
impressions, clicks, installs, cost_usd, cost_vnd
```

Các chỉ số tính toán (ctr, cti, cpi, cpm) bị loại bỏ — sẽ tính ở backend sau khi group.

---

## Thay đổi 2: Stored Procedure `sp_report_grouped`

### Mục đích

Backend gọi SP thay vì query trực tiếp view. SP nhận tham số filter + group mode, trả về resultset đã GROUP + SUM sẵn. Giảm tải cho PHP khi khoảng thời gian lớn có nhiều dòng.

### Tham số

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `p_date_from` | DATE | Ngày bắt đầu |
| `p_date_to` | DATE | Ngày kết thúc |
| `p_group_mode` | VARCHAR(10) | `'source'` hoặc `'os'` |
| `p_customer_name` | VARCHAR(255) | Rỗng `''` = không lọc |
| `p_sources` | TEXT | Comma-separated, `''` = không lọc |
| `p_regions` | TEXT | Comma-separated |
| `p_os` | TEXT | Comma-separated |
| `p_formats` | TEXT | Comma-separated |
| `p_types` | TEXT | Comma-separated |

### Logic

```
IF p_group_mode = 'source':
    GROUP BY source, customer_name
    → trả: source, customer_name, SUM(clicks), SUM(impressions), SUM(installs), SUM(cost_usd), SUM(cost_vnd)

ELSE (p_group_mode = 'os'):
    GROUP BY os, source, fomat, type
    → trả: os, source, fomat, type, SUM(clicks), SUM(impressions), SUM(installs), SUM(cost_usd), SUM(cost_vnd)
```

Filters dùng `FIND_IN_SET()` cho tham số comma-separated. Rỗng = không lọc.

### Quản lý trong dbt

- Tạo macro `create_sp_report_grouped` trong `d:\dbt-mysql\mysql\macros\`
- Chạy bằng `dbt run-operation create_sp_report_grouped`
- Macro sẽ thực thi `DROP PROCEDURE IF EXISTS` + `CREATE PROCEDURE`

---

## Thay đổi 3: Backend (ReportController.php)

Cập nhật `ReportController::index()` để gọi SP thay vì query Eloquent:

```php
$results = DB::select('CALL sp_report_grouped(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    $dateFrom, $dateTo, $groupMode, $selectedCustomer,
    implode(',', $selectedSources),
    implode(',', $selectedRegions),
    implode(',', $selectedOs),
    implode(',', $selectedFormats),
    implode(',', $selectedTypes),
]);
```

PHP nhận kết quả đã group, build tree structure + tính metrics (ctr, cti, cpi, cpm) ở mỗi level.

---

## Files bị ảnh hưởng

| File | Hành động |
|------|-----------|
| `d:\dbt-mysql\mysql\models\example\split_campaign.sql` | MODIFY — viết lại hoàn toàn |
| `d:\dbt-mysql\mysql\macros\create_sp_report_grouped.sql` | NEW — macro tạo stored procedure |
| `d:\laravel\BaoCaoQC\app\Http\Controllers\ReportController.php` | MODIFY — gọi SP thay vì Eloquent |
