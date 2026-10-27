# Architecture

## Nền tảng
- npm workspaces: `apps/web` (Next.js 16/React 19) và `apps/api` (NestJS 11). Một lockfile.
- Giao diện admin là repo Git riêng (`How2choose-admin`, Next.js 16.4.3, cổng 3002), chỉ gọi API.
- PostgreSQL 17 qua Docker Compose trên `127.0.0.1:5433`; Prisma 7 với PostgreSQL adapter.
- MinIO qua Docker Compose trên `127.0.0.1:9000` (console `9001`) để lưu file; bucket private và API cấp presigned URL có thời hạn.
- TypeScript strict, Tailwind 4. Backend sở hữu business logic và dữ liệu.

## Authentication
- NestJS xử lý email hoặc số điện thoại + mật khẩu; mật khẩu băm bằng scrypt với salt riêng.
- Google OAuth authorization code flow trên backend; Client ID/Secret chỉ ở API. Google ID token được thư viện chính thức xác thực. Google `sub` là khóa tài khoản.
- Phiên lưu trong PostgreSQL (`Session`); browser chỉ giữ token ngẫu nhiên trong cookie HttpOnly. DB chỉ lưu hash token; logout xóa phiên.
- `AuthModule` cấp user ID đã xác minh cho `RecipientsModule`; mọi truy vấn hồ sơ lọc theo ownerId.
- Admin dùng cùng bảng `Session` nhưng TTL 7 ngày; `adminLogin` chỉ tạo phiên cho `role = ADMIN`.
  `AdminGuard` bọc mọi route `/api/admin` (trừ login). Admin UI chuyển tiếp cookie phiên khi
  server-side fetch, không lưu token trong localStorage.
- Frontend dùng `credentials: include`; API CORS và CSRF-origin chỉ cho `WEB_ORIGIN` +
  `ADMIN_ORIGIN`. Local dùng cùng hostname `localhost` cho web/admin/API để chia sẻ cookie;
  database URL dùng `127.0.0.1` vì Docker bind IPv4.
- Production cần HTTPS và web/admin/API cùng site để cookie SameSite=Lax hoạt động. Khi chạy
  trên các subdomain, đặt `COOKIE_DOMAIN`; admin và API khác site hoàn toàn sẽ không dùng được
  cookie phiên. Cần bổ sung email/SMS verification, rate limiting, khôi phục mật khẩu và liên kết
  tài khoản trước khi mở đăng ký công khai.

## Module hiện có
- Health: liveness và database readiness.
- Auth: register/login/logout/me, Google OAuth start/callback và trạng thái provider.
- Recipients: tạo, liệt kê, xem, sửa hồ sơ của chủ tài khoản.
- Catalog: danh mục nhiều cấp, sản phẩm thuộc nhiều danh mục, sản phẩm có nhiều biến thể. Giá, giảm giá phần trăm và giảm giá số tiền được lưu ở sản phẩm/biến thể; giá hiệu lực do API tính.
- Bộ lọc catalog thực hiện ở API. Giao diện chỉ hiển thị tỉnh/thành sau sáp nhập và gửi `v2:{code}`; API vẫn chấp nhận `v1:{code}` để tương thích. Khu vực giao hàng lưu bằng mã trên sản phẩm (`ALL`, `HN`, `HCM`, `DN`); ba tỉnh trùng mã được ánh xạ sang mã seed, các tỉnh khác chỉ khớp `ALL`. Khoảng giá xét giá sau giảm của từng biến thể và chỉ phân trang sau khi lọc. Cách này phù hợp catalog seed nhỏ, cần tối ưu truy vấn khi số sản phẩm tăng.
- Locations: API trung gian gọi Province Open API v1/v2 theo từng cấp, timeout 8 giây và cache bộ nhớ 24 giờ; không tải toàn bộ cây địa giới. V1 gồm tỉnh/huyện/xã; v2 gồm tỉnh/xã. Endpoint đối chiếu xã cũ sang mới trả tất cả kết quả, không tự chọn khi có nhiều kết quả. Ứng dụng cần xử lý lúc nhà cung cấp tạm lỗi; trước khi nhận đơn thật phải xác thực địa chỉ trên backend và xem xét dữ liệu địa giới cục bộ.
- Media sản phẩm được gắn ở cấp biến thể để mỗi màu/kích thước có thể có hình ảnh hoặc video riêng. Media cấp sản phẩm (`variantId = null`) là ảnh chung/bìa và là fallback khi biến thể chưa có ảnh; API catalog trả cả hai cấp.
- Media: avatar người dùng và nhiều ảnh/video cho mỗi sản phẩm. PostgreSQL chỉ lưu object key và metadata; binary nằm trong MinIO.
- Admin: CRUD danh mục/sản phẩm/biến thể dưới `/api/admin`; sản phẩm tạo nháp, xuất bản có kiểm tra biến thể/danh mục/đóng gói; ngừng bán thay vì xóa; đơn hàng chỉ đọc và tạo lại vận đơn GHN. UI admin nằm ở repo riêng, không truy cập DB trực tiếp.

## Media storage
- Avatar: JPEG, PNG hoặc WebP, tối đa 5 MB; chủ tài khoản tự tải lên/xóa.
- Media sản phẩm: JPEG, PNG, WebP tối đa 10 MB; MP4 hoặc WebM tối đa 100 MB; chỉ tài khoản `ADMIN` được thay đổi.
- Object key được backend tạo ngẫu nhiên theo phạm vi `avatars/{userId}` hoặc `products/{productId}`; không dùng tên file do client gửi làm đường dẫn.
- Khi thay avatar hoặc xóa media, database được cập nhật trước rồi object cũ được dọn khỏi MinIO. URL tải xuống mặc định hết hạn sau 15 phút.

## Các module tiếp theo
Catalog và seed đã có API đọc công khai (`/api/catalog/categories`, `/api/catalog/products`, `/api/catalog/products/:slug`) và dữ liệu mẫu; admin CRUD catalog/đơn đã có API và UI repo riêng → recommendation → orders/payments → gift history.
AI trích xuất ý định, backend lọc catalog, model giải thích, backend kiểm tra lại ID/giá/tồn kho.
Payment tính tổng phía backend và xác minh callback theo transaction/idempotency.

## Kiểm thử
HTTP tests có mock Prisma cho kiểm tra nhanh; migration thật với PostgreSQL local/CI. Admin có
kiểm thử tích hợp PostgreSQL (`test/admin.spec.ts`). Google OAuth, GHN/VNPAY cần credentials để
kiểm tra tương tác thật. Upload MinIO cần container khỏe; UI admin có lint/typecheck/build riêng.
Không dùng token hay key thật trong repo.
