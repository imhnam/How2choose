# Howtochoose

Website gợi ý và mua quà theo hồ sơ người nhận, ngân sách, dịp tặng và lịch sử quà.

## Trạng thái
Đã có đăng ký/đăng nhập, phiên cookie, API Google OAuth, hồ sơ người nhận, MinIO, catalog, giỏ hàng và checkout với GHN staging/VNPAY sandbox. Đăng nhập Google và giao dịch staging thật cần credentials riêng. AI và vận chuyển production chưa triển khai.

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

`db:up` khởi động cả PostgreSQL và MinIO. MinIO API: http://localhost:9000 — console: http://localhost:9001. Tài khoản local nằm trong `compose.yaml` và chỉ dùng cho môi trường phát triển.

Catalog MVP có các endpoint `GET /api/catalog/categories`, `GET /api/catalog/products?category=...&q=...&region=v2:1&minPrice=100000&maxPrice=500000&minRating=4` và `GET /api/catalog/products/:slug`; giao diện nằm tại `http://localhost:3000/catalog`. Bộ lọc “Khu vực” trên catalog chỉ hiển thị tỉnh/thành sau sáp nhập và gửi `v2:{provinceCode}`; API còn chấp nhận `v1:{provinceCode}` để tương thích. Sản phẩm giao toàn quốc luôn phù hợp. Dữ liệu tỉnh/thành lấy qua `GET /api/locations/provinces?version=current|legacy`, quận/huyện cũ qua `/api/locations/districts?provinceCode=...`, xã/phường qua `/api/locations/wards?version=current|legacy&parentCode=...`. Giỏ hàng thử nghiệm nằm tại `http://localhost:3000/cart`, lưu trong localStorage; `/checkout` cho phép nhập địa chỉ cũ hoặc mới nhưng chưa tạo đơn hoặc thanh toán.

Catalog MVP có các endpoint `GET /api/catalog/categories`, `GET /api/catalog/products?...` và `GET /api/catalog/products/:slug`; giao diện nằm tại `http://localhost:3000/catalog`. Giỏ hàng nằm tại `http://localhost:3000/cart`; `/checkout` dùng `POST /api/orders/quote` để xác nhận giá/tồn kho và lấy phí GHN staging, sau đó tạo đơn giữ hàng 15 phút và chuyển sang VNPAY sandbox. Đơn chỉ tạo vận đơn GHN sau IPN hợp lệ. Hiện GHN quote chỉ hỗ trợ địa chỉ legacy vì fee API yêu cầu mã district/ward cũ.
Nếu web hiện “Không kết nối được máy chủ” hoặc trình duyệt báo `Failed to fetch`, kiểm tra `http://localhost:3001/api/health`. Nếu địa chỉ này không mở được, chạy `npm.cmd run dev` từ thư mục gốc để khởi động cả web và API; nếu web đã chạy riêng, có thể chạy `npm.cmd run dev -w @howtochoose/api` trong một terminal khác. Khởi động lại web sau khi sửa `apps/web/.env.local`.
### Cấu hình GHN/VNPAY staging

Điền các biến sau trong `apps/api/.env`; không đặt token/secret trong biến `NEXT_PUBLIC_*` và không commit chúng:
Trên Windows, API local chạy không dùng Nest watch vì chế độ watch có thể gặp lỗi `taskkill Access denied` rồi thoát. Sau khi sửa code trong `apps/api`, dừng lệnh dev bằng Ctrl+C và chạy lại `npm.cmd run dev`.
- GHN: `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_FROM_DISTRICT_ID`, `GHN_REQUIRED_NOTE` (`KHONGCHOXEMHANG`, `CHOXEMHANGKHONGTHU` hoặc `CHOTHUHANG`). GHN endpoint được khóa ở staging.
- VNPAY: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `API_PUBLIC_URL` và `VNPAY_IPN_URL`. Hai URL phải là HTTPS công khai; cấu hình `VNPAY_IPN_URL` trong merchant dashboard VNPAY sandbox.
- `ORDER_QUOTE_SECRET`: thay secret local mặc định bằng chuỗi ngẫu nhiên dài tối thiểu 32 ký tự trước khi triển khai.

Các profile đóng gói do `db:seed` thêm cho catalog demo chỉ là số liệu ước lượng để thử staging. Hãy cập nhật cân nặng/kích thước thực trước khi dùng cho fulfillment. Quote dùng phí GHN do shop trả và cộng khoản phí đó vào tổng VNPAY sandbox.

Tài liệu GHN đã đối chiếu: [Tạo đơn](https://developer.ghn.vn/vi/docs/order/create), [Tính phí](https://developer.ghn.vn/vi/docs/order/calculate-fee), [Dịch vụ khả dụng](https://developer.ghn.vn/vi/docs/master-data/get-service), [tỉnh/thành cũ](https://developer.ghn.vn/vi/docs/master-data/get-province), [quận/huyện](https://developer.ghn.vn/vi/docs/master-data/get-district) và [phường/xã](https://developer.ghn.vn/vi/docs/master-data/get-ward). Cấu hình VNPAY theo [tài liệu PAY sandbox](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).
Nếu endpoint mới trả `Cannot GET /api/...` trong khi `/api/health` vẫn hoạt động, cổng 3001 thường còn một tiến trình API cũ. Dừng terminal chạy API cũ rồi khởi động lại; kiểm tra route mới trong log Nest hoặc mở endpoint đó trực tiếp. Không chạy thêm một API thứ hai trên cổng 3001.

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
