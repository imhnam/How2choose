# Architecture

## Nền tảng
- npm workspaces: `apps/web` (Next.js 16/React 19) và `apps/api` (NestJS 11). Một lockfile.
- PostgreSQL 17 qua Docker Compose trên `127.0.0.1:5433`; Prisma 7 với PostgreSQL adapter.
- TypeScript strict, Tailwind 4. Backend sở hữu business logic và dữ liệu.

## Authentication
- NestJS xử lý email hoặc số điện thoại + mật khẩu; mật khẩu băm bằng scrypt với salt riêng.
- Google OAuth authorization code flow trên backend; Client ID/Secret chỉ ở API. Google ID token được thư viện chính thức xác thực. Google `sub` là khóa tài khoản.
- Phiên lưu trong PostgreSQL (`Session`); browser chỉ giữ token ngẫu nhiên trong cookie HttpOnly. DB chỉ lưu hash token; logout xóa phiên.
- `AuthModule` cấp user ID đã xác minh cho `RecipientsModule`; mọi truy vấn hồ sơ lọc theo ownerId.
- Frontend dùng `credentials: include` và API CORS chỉ cho WEB_ORIGIN. Local dùng cùng hostname `localhost` cho web/API để chia sẻ cookie; database URL dùng `127.0.0.1` vì Docker bind IPv4.
- Production cần HTTPS và web/API cùng site để cookie SameSite=Lax hoạt động. Cần bổ sung email/SMS verification, rate limiting, khôi phục mật khẩu và liên kết tài khoản trước khi mở đăng ký công khai.

## Module hiện có
- Health: liveness và database readiness.
- Auth: register/login/logout/me, Google OAuth start/callback và trạng thái provider.
- Recipients: tạo, liệt kê, xem, sửa hồ sơ của chủ tài khoản.
- Product: schema catalog nền tảng.

## Các module tiếp theo
Catalog và seed → recommendation → orders/payments → gift history.
AI trích xuất ý định, backend lọc catalog, model giải thích, backend kiểm tra lại ID/giá/tồn kho.
Payment tính tổng phía backend và xác minh callback theo transaction/idempotency.

## Kiểm thử
HTTP tests có mock Prisma cho kiểm tra nhanh; migration thật với PostgreSQL local/CI. Google OAuth cần Google credentials để kiểm tra tương tác thật. Không dùng token hay key thật trong repo.
