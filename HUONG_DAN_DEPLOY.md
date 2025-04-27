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
- Root Directory: Để trống (mặc định)
- Build Command: `npm run build` (mặc định)
- Output Directory: `.next` (mặc định)
- Install Command: `npm install` (mặc định)

### 4. Thiết lập biến môi trường
- Thêm các biến môi trường sau (nhấp vào "Add" cho mỗi biến):

| Tên biến | Giá trị | Môi trường |
|----------|---------|------------|
| NEXT_PUBLIC_SUPABASE_URL | https://[your-project-id].supabase.co | Production, Preview, Development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [your-anon-key] | Production, Preview, Development |
| SUPABASE_SERVICE_ROLE_KEY | [your-service-role-key] | Production, Preview, Development |

**Lưu ý quan trọng**:
- Nhập giá trị trực tiếp, không sử dụng @references
- Đảm bảo chọn cả 3 môi trường cho mỗi biến
- Các giá trị này đã được cấu hình trong tệp vercel.json, nhưng bạn cần nhập giá trị thực tế

### 5. Triển khai
- Nhấp vào nút "Deploy"
- Đợi quá trình triển khai hoàn tất (thường mất 1-2 phút)

### 6. Kiểm tra ứng dụng
- Sau khi triển khai hoàn tất, nhấp vào URL được cung cấp để kiểm tra ứng dụng
- Kiểm tra xem tất cả các chức năng có hoạt động đúng không

## Xử lý sự cố

Nếu gặp lỗi trong quá trình triển khai:

1. Kiểm tra nhật ký xây dựng để tìm lỗi cụ thể
2. Đảm bảo các biến môi trường được thiết lập chính xác
3. Kiểm tra kết nối Supabase

## Cấu hình bổ sung (nếu cần)

Nếu bạn gặp vấn đề với cấu hình mặc định, bạn có thể điều chỉnh các cài đặt sau trong tệp vercel.json:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "",
    "SUPABASE_SERVICE_ROLE_KEY": ""
  },
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "github": {
    "silent": true
  }
}
```

## Lưu ý bảo mật

Sau khi triển khai thành công, hãy xem xét việc thay đổi khóa service role của bạn trong Supabase để đảm bảo an toàn.
