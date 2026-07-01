# Top QC Page Implementation Walkthrough

## 1. Backend & Routing
- Đã thêm `TopCampaignController.php` để xử lý query: group by `campaign_name`, tự động filter lọc source, customer theo thời gian và tính toán các chỉ số tổng hợp (Cost, Impressions, Clicks, Installs, CPI, v.v.).
- Đã thêm route `GET /top-campaign` vào file `routes/web.php`.

## 2. Trang "Top QC" (Frontend)
- **Menu Sidebar:** Đã bổ sung link **Top QC** kèm icon cúp 🏆 nằm giữa "Báo cáo" và "So sánh".
- **Giao diện chính:** Gồm phần tiêu đề, Filter Bar, bảng dữ liệu xếp hạng và phân trang.
- **Tính năng lọc (FilterBar):** Kế thừa toàn bộ tính năng lọc từ trang Báo cáo (Ngày, Khách hàng, Nguồn, Tiền tệ, Hiển thị cột) và bổ sung thêm 1 dropdown **"Top"** cho phép người dùng chọn xem 10, 100 hoặc 1000 chiến dịch hàng đầu.
- **Bảng Dữ Liệu (TopTable):**
    - Mặc định sẽ hiển thị các cột quan trọng (Ad Name, Channel, OS, Cost, Impressions, Clicks, Installs, CPI) và sắp xếp dựa trên **Cost giảm dần**.
    - Cho phép click vào tiêu đề cột để **Sắp xếp (Sorting)** (bấm lần nữa để đảo chiều asc/desc).
    - Được thiết kế với tính năng **Phân trang (Pagination)** hiển thị 10 bản ghi mỗi trang, có điều hướng Previous, Next và số trang chi tiết.
    - Dòng tổng hợp (Summary row) cho phép bạn xem nhanh số liệu toàn bộ top chiến dịch.

## 3. Tính năng Xuất Excel
- Đã cài đặt thư viện `xlsx` (SheetJS) bằng npm để xử lý hoàn toàn phía trình duyệt.
- Xây dựng 1 hàm tiện ích dùng chung ở `utils/exportExcel.js`.
- Bổ sung **Nút Xuất Excel** có màu xanh lá nằm ở góc phải (cùng khu vực nút Clear) trên thanh filter bar cho cả:
    - Trang "Top QC"
    - Trang "Báo cáo" hiện tại
- File tải xuống sẽ được đặt tên thông minh dựa trên bộ lọc, ví dụ: `Top10_TatCa_TatCa_2026-06-25_to_2026-07-01.xlsx`.

## 4. Cải thiện định dạng CSS
- Cập nhật file `app.css` để **căn giữa** tất cả dữ liệu dạng số trong các bảng, đồng thời tạo ra class đặc biệt `.col-text` để **căn trái** các cột nội dung chữ như Nhóm Nguồn và Tên Chiến Dịch.
- Cột tên chiến dịch (`campaign_name`) được thiết lập `min-width` và cho phép xuống dòng (`break-word`) để tránh phá vỡ giao diện bảng khi tên quá dài.
- Nút "Xuất Excel" và "Clear" sử dụng tính chất `margin-left: auto; align-self: flex-start;` để luôn được **căn lề phải** trên cùng (kể cả khi thanh công cụ phải rớt dòng trên các màn hình hẹp).

