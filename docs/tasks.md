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
- [x] Hồ sơ cá nhân cập nhật tên, ảnh đại diện và lưu địa chỉ giao hàng mặc định theo tài khoản.
- [x] MinIO local, upload/xóa avatar và ảnh/video sản phẩm, presigned URL, quyền upload sản phẩm cho admin.
- [ ] Cấu hình Google OAuth Client ID/Secret và kiểm tra đăng nhập Google thật.
- [ ] Xác minh email/SMS, khôi phục mật khẩu, rate limiting trước khi mở đăng ký công khai.
- [ ] Luồng liên kết Google với tài khoản local sau xác minh quyền sở hữu.
- [ ] Chốt chính sách xóa hồ sơ khi đã có lịch sử quà.

## Tiếp theo
- [x] Catalog dữ liệu seed: danh mục nhiều cấp, sản phẩm nhiều danh mục, biến thể, giảm giá, điểm đánh giá và API đọc.
- [x] Trang catalog với lọc danh mục/tìm kiếm và trang chi tiết biến thể.
- [x] Header catalog có gợi ý tìm kiếm, icon giỏ hàng/thông báo, avatar và tên; lọc theo khu vực giao hàng, giá và đánh giá.
- [x] Giỏ hàng localStorage: thêm vào giỏ, mua ngay, cập nhật số lượng, chọn sản phẩm/chọn tất cả và xóa món đã chọn; giao diện bảng kiểu Shopee, chọn người nhận ở bước 2 checkout.
- [x] Tích hợp danh sách tỉnh/huyện/xã trước và tỉnh/xã sau sáp nhập vào bộ lọc catalog và màn nhập địa chỉ checkout thử nghiệm.
- [x] Admin CRUD catalog và quản lý media theo biến thể.
- [x] Giao diện quản trị ở repo riêng: đăng nhập admin, tổng quan, danh mục, sản phẩm/biến thể/media, đơn hàng chỉ đọc và tạo lại vận đơn.
- [ ] Kiểm thử E2E Playwright cho admin và kiểm tra upload/preview MinIO khi container khỏe.
- [ ] Quản lý người dùng/vai trò, audit log và 2FA cho admin.
- [x] AI recommendation bằng Gemini: hội thoại lưu PostgreSQL theo hồ sơ, structured output cho gói một/nhiều món, tổng giá xác thực theo ngân sách và kiểm thử mock.
- [x] Hardening recommendation: rate limit 5 POST/phút/tài khoản, idempotency key, ký lại media URL khi đọc lịch sử, xử lý output bị cắt/bị chặn.
- [x] Recommendation P1: lọc candidate theo khu vực giao của người nhận, hội thoại mới + xóa lịch sử, revalidate giá/tồn trước khi thêm giỏ, thêm từng món, hủy request, ô nhập ngân sách số.
- [x] Giỏ hàng, orders, quote GHN staging, VNPAY sandbox, IPN idempotent và tạo vận đơn sau thanh toán.
- [ ] Xác nhận đã tặng và loại trừ quà cũ.
- [ ] Playwright cho luồng chính, triển khai demo và README portfolio.
- [ ] Theo dõi bản vá Swagger/js-yaml và chuỗi phụ thuộc minio; npm audit gần nhất còn 6 cảnh báo moderate (multer, body-parser, fast-uri đã xử lý).

Chỉ đánh dấu hoàn thành khi code, migration và kiểm tra liên quan đã chạy. Google OAuth chỉ hoàn thành tích hợp mã nguồn; kiểm tra với Google thật cần credentials.

GHN/VNPAY sandbox đã hoàn thành mã nguồn và kiểm tra mocked; kiểm thử staging thực cần GHN token/shop, VNPAY credentials và URL HTTPS công khai. GHN quote hiện chỉ hỗ trợ địa chỉ legacy; package profiles seed là số liệu ước lượng.
