# Development tasks

## Foundation
- [x] npm workspace, Next.js, NestJS, PostgreSQL Compose, Prisma.
- [x] Health API, Swagger, kiểm tra lint/typecheck/test/build, CI.
- [x] Bản nháp product/spec và hướng dẫn agent.

## Tài khoản và hồ sơ
- [x] Chốt spec email/số điện thoại + mật khẩu và Google OAuth.
- [x] API đăng ký, đăng nhập, đăng xuất và phiên cookie.
- [x] API Google OAuth start/callback, xác thực ID token.
- [x] API/UI tạo, liệt kê và sửa hồ sơ người nhận.
- [x] MinIO local, upload/xóa avatar và ảnh/video sản phẩm, presigned URL, quyền upload sản phẩm cho admin.
- [ ] Cấu hình Google OAuth Client ID/Secret và kiểm tra đăng nhập Google thật.
- [ ] Xác minh email/SMS, khôi phục mật khẩu, rate limiting trước khi mở đăng ký công khai.
- [ ] Luồng liên kết Google với tài khoản local sau xác minh quyền sở hữu.
- [ ] Chốt chính sách xóa hồ sơ khi đã có lịch sử quà.

## Tiếp theo
- [x] Catalog dữ liệu seed: danh mục nhiều cấp, sản phẩm nhiều danh mục, biến thể, giảm giá, điểm đánh giá và API đọc.
- [x] Trang catalog với lọc danh mục/tìm kiếm và trang chi tiết biến thể.
- [ ] Admin CRUD catalog và quản lý media theo biến thể.
- [ ] AI recommendation, structured output và tập tình huống đánh giá.
- [ ] Giỏ hàng, orders, VNPAY sandbox và callback idempotent.
- [ ] Xác nhận đã tặng và loại trừ quà cũ.
- [ ] Playwright cho luồng chính, triển khai demo và README portfolio.
- [ ] Theo dõi bản vá Swagger/js-yaml; lần kiểm tra npm audit gần nhất còn cảnh báo moderate trong nhánh này.

Chỉ đánh dấu hoàn thành khi code, migration và kiểm tra liên quan đã chạy. Google OAuth chỉ hoàn thành tích hợp mã nguồn; kiểm tra với Google thật cần credentials.
