# Tính năng: Sửa Bộ Dữ Liệu (Compare Page)

## Mục tiêu
Cho phép người dùng chỉnh sửa thông tin (tên, khoảng thời gian, customer, danh sách nguồn dữ liệu) của một Bộ Dữ Liệu đã thêm trên trang So Sánh mà không cần xoá đi tạo lại.

## Phạm vi thay đổi
- Trang bị ảnh hưởng: So sánh (Compare)
- Tái sử dụng UI: Modal Thêm Bộ Dữ Liệu (`AddDatasetModal.jsx`)

## Thiết kế Kỹ thuật (Technical Design)

### 1. DatasetList.jsx (Giao diện thẻ)
- Thêm nút `Sửa` (icon ✏️) nằm kế bên nút `Xoá` (✕) cho mỗi thẻ Dataset.
- Thêm prop `onEdit(dataset)` để truyền sự kiện bấm nút sửa lên component cha.

### 2. Compare/Index.jsx (Quản lý State)
- Thêm state mới: `const [editingDataset, setEditingDataset] = useState(null)`.
- Khi gọi `onEdit` từ `DatasetList`:
  - `setEditingDataset(dataset_đang_chọn)`
  - Mở modal bằng `setIsModalOpen(true)`
- Thay đổi logic của `handleSaveDataset`:
  - Nếu `editingDataset` khác null: Ghi đè dataset mới vào vị trí của dataset cũ trong mảng `datasets`. Giữ nguyên màu sắc (thứ tự).
  - Nếu `editingDataset` là null: Thêm vào cuối mảng (như cũ).
- Khi đóng Modal: reset `editingDataset` về `null`.

### 3. AddDatasetModal.jsx (Form nhập liệu)
- Nhận prop mới `editingDataset`.
- Sử dụng `useEffect` để theo dõi sự thay đổi của `editingDataset`:
  - Nếu có giá trị: Pre-fill (điền sẵn) các trường Tên, Customer, Ngày, và Sources.
  - Nếu null: Trả các trường về giá trị mặc định (rỗng).
- Tiêu đề modal (Header) tự động thay đổi:
  - `"Sửa bộ dữ liệu"` (khi có editingDataset)
  - `"Thêm bộ dữ liệu"` (khi tạo mới)
