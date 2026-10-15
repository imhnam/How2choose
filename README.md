# Howtochoose

Website gợi ý và mua quà theo hồ sơ người nhận, ngân sách, dịp tặng và lịch sử quà.

## Trạng thái
Đã có đăng ký/đăng nhập bằng email hoặc số điện thoại và mật khẩu, phiên cookie, API Google OAuth, form hồ sơ người nhận, MinIO và catalog MVP. Google login thật cần credentials riêng của bạn. AI, giỏ hàng và payment chưa triển khai.

## Yêu cầu
- Node.js 22.12+ và npm 10+.
- Docker Desktop chạy Linux containers.

## Chạy local (PowerShell tại D:\Howtochoose)
1. `npm.cmd ci`
2. `npm.cmd run setup`
3. `npm.cmd run db:up`
4. `npm.cmd run db:deploy`
5. `npm.cmd run db:seed`
6. `npm.cmd run db:generate`
7. `npm.cmd run dev`

Web: http://localhost:3000 — API: http://localhost:3001/api — Swagger: http://localhost:3001/api/docs — readiness: http://localhost:3001/api/health/ready

`db:up` khởi động cả PostgreSQL và MinIO. MinIO API: http://localhost:9000 — console: http://localhost:9001. Tài khoản local nằm trong `compose.yaml` và chỉ dùng cho môi trường phát triển.

Avatar được tải lên bằng tài khoản đang đăng nhập. Upload/xóa ảnh hoặc video sản phẩm yêu cầu `User.role = ADMIN`; trong local có thể mở `npm.cmd run db:studio` để đặt quyền cho tài khoản quản trị. Các endpoint media có thể thử tại Swagger.

Catalog MVP có các endpoint `GET /api/catalog/categories`, `GET /api/catalog/products?category=...&q=...` và `GET /api/catalog/products/:slug`; giao diện nằm tại `http://localhost:3000/catalog`.

Nếu web hiện “Không kết nối được máy chủ” hoặc trình duyệt báo `Failed to fetch`, kiểm tra `http://localhost:3001/api/health`. Nếu địa chỉ này không mở được, chạy `npm.cmd run dev` từ thư mục gốc để khởi động cả web và API; nếu web đã chạy riêng, có thể chạy `npm.cmd run dev -w @howtochoose/api` trong một terminal khác. Khởi động lại web sau khi sửa `apps/web/.env.local`.

Trên Windows, API local chạy không dùng Nest watch vì chế độ watch có thể gặp lỗi `taskkill Access denied` rồi thoát. Sau khi sửa code trong `apps/api`, dừng lệnh dev bằng Ctrl+C và chạy lại `npm.cmd run dev`.

Giữ hostname **localhost** cho cả web/API. PostgreSQL dùng **127.0.0.1:5433** trong DATABASE_URL để kết nối đúng với Docker IPv4. `npm run setup` chỉ tạo file môi trường còn thiếu, không ghi đè file hiện có.

## Google Login
1. Tạo Google Cloud project và cấu hình OAuth consent screen.
2. Tạo OAuth Client loại **Web application**.
3. Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`.
4. Trong `apps/api/.env`, điền `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`; giữ `GOOGLE_REDIRECT_URI` như trên.
5. Khởi động lại API. Nút **Tiếp tục với Google** sẽ xuất hiện trên trang đăng nhập khi provider đã cấu hình.

Trong chế độ Testing của Google, thêm tài khoản của bạn vào danh sách test users. Không đưa Client Secret vào Git hoặc biến `NEXT_PUBLIC_*`. Không tự động ghép Google với tài khoản email/mật khẩu trùng email.

## Lệnh kiểm tra
- `npm.cmd run check`: lint, typecheck và API tests.
- `npm.cmd run build`: build API và web.
- `npm.cmd run db:validate`: kiểm tra schema.
- `npm.cmd run db:migrate -- --name ten_thay_doi`: tạo migration mới.
- `npm.cmd run db:deploy`: áp dụng migration đã lưu.
- `npm.cmd run db:seed`: nạp dữ liệu catalog giả lập, có thể chạy lại an toàn.

## Tài liệu
`docs/product.md` mô tả MVP; `specs/authentication.md` và `specs/recipient-profile.md` là tiêu chí tính năng; `docs/architecture.md` ghi quyết định kỹ thuật; `docs/tasks.md` theo dõi tiến độ; `AGENTS.md` hướng dẫn agent.

Tài khoản email/số điện thoại ở bản này chưa xác minh danh tính, chưa có đặt lại mật khẩu hoặc chống thử mật khẩu nhiều lần. Cần bổ sung trước khi mở đăng ký công khai.
