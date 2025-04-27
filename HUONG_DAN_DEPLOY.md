# Hướng dẫn triển khai lên Vercel

## Các bước triển khai nhanh

### 1. Đăng nhập vào Vercel
- Truy cập [vercel.com](https://vercel.com)
- Đăng nhập bằng tài khoản của bạn

### 2. Tạo dự án mới
- Nhấp vào nút "Add New..." > "Project"
- Chọn kho lưu trữ GitHub chứa dự án của bạn

### 3. Cấu hình dự án
- Framework: Next.js (tự động phát hiện)
- Các cài đặt khác giữ nguyên mặc định

### 4. Thiết lập biến môi trường
- Thêm các biến môi trường sau (nhấp vào "Add" cho mỗi biến):

| Tên biến | Giá trị | Môi trường |
|----------|---------|------------|
| NEXT_PUBLIC_SUPABASE_URL | https://[your-project-id].supabase.co | Production, Preview, Development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [your-anon-key] | Production, Preview, Development |
| SUPABASE_SERVICE_ROLE_KEY | [your-service-role-key] | Production, Preview, Development |

### 5. Triển khai
- Nhấp vào nút "Deploy"
- Đợi quá trình triển khai hoàn tất

### 6. Kiểm tra ứng dụng
- Nhấp vào URL được cung cấp để kiểm tra ứng dụng

## Xử lý sự cố

Nếu gặp lỗi trong quá trình triển khai:

1. Kiểm tra nhật ký xây dựng để tìm lỗi cụ thể
2. Đảm bảo các biến môi trường được thiết lập chính xác
3. Kiểm tra kết nối Supabase

## Lưu ý bảo mật

Sau khi triển khai thành công, hãy xem xét việc thay đổi khóa service role của bạn trong Supabase để đảm bảo an toàn.
