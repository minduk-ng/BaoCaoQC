import * as XLSX from 'xlsx';

/**
 * Xuất dữ liệu ra file Excel
 * @param {Array} data - Mảng objects chứa dữ liệu
 * @param {Array} columns - Cấu hình cột [{ key: 'source', label: 'Nguồn' }, ...]
 * @param {string} filename - Tên file muốn lưu (bao gồm cả .xlsx)
 */
export function exportToExcel(data, columns, filename) {
    if (!data || data.length === 0) return;

    // Chuẩn bị header maps
    const headerMap = {};
    columns.forEach(col => {
        headerMap[col.key] = col.label;
    });

    // Transform data
    const exportData = data.map(row => {
        const rowData = {};
        columns.forEach(col => {
            // Lấy giá trị tương ứng, nếu không có thì gán chuỗi rỗng
            rowData[col.label] = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        });
        return rowData;
    });

    // Tạo worksheet từ mảng JSON
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns dựa trên độ dài nội dung và header
    const wscols = columns.map(col => {
        const headerLen = col.label.length;
        // Tìm cell có dữ liệu dài nhất trong cột này
        const maxDataLen = exportData.reduce((max, row) => {
            const val = row[col.label];
            const len = val ? String(val).length : 0;
            return Math.max(max, len);
        }, 0);
        return { wch: Math.max(headerLen, maxDataLen) + 2 }; // +2 padding
    });
    worksheet['!cols'] = wscols;

    // Tạo workbook và thêm worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Tải file về
    XLSX.writeFile(workbook, filename);
}
