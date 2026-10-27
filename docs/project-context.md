# Project context — Howtochoose

> Ảnh chụp nhanh codebase, cập nhật 2026-10-27. Đây là tài liệu định hướng, không thay thế
> `docs/product.md`, các file trong `specs/` hay `apps/api/prisma/schema.prisma`.
> Cập nhật file này khi cấu trúc module, luồng chính hoặc trạng thái tính năng thay đổi.

## 1. Sản phẩm

Howtochoose (How2choose) giúp người dùng chọn và mua quà cho bạn bè, người yêu, gia đình dựa
trên sở thích, dịp, ngân sách và lịch sử quà.

Luồng MVP: đăng ký/đăng nhập → tạo hoặc chọn hồ sơ người nhận → chọn dịp và ngân sách → AI tư vấn
từ catalog → giỏ hàng → thanh toán sandbox → xác nhận đã tặng.

Phạm vi hiện tại: một cửa hàng, tiền VND, giao diện tiếng Việt, chỉ giao dịch/vận chuyển thử nghiệm
(VNPAY sandbox, GHN staging). Không dùng production.

## 2. Công nghệ và hạ tầng

- npm workspaces, một `package-lock.json`; Node.js >= 22.12, npm >= 10.
- `apps/web`: Next.js 16.4 (App Router), React 19.3, Tailwind 4, TypeScript strict.
- `apps/api`: NestJS 11, Prisma 7 + `@prisma/adapter-pg`, PostgreSQL 17.
- `D:\How2choose-admin`: repo Git riêng cho giao diện quản trị, Next.js 16.4.3, React 19.3,
  Tailwind 4, cổng 3002. Không phải workspace của repo này.
- PostgreSQL qua Docker Compose: `127.0.0.1:5433`.
- MinIO qua Docker Compose: API `127.0.0.1:9000`, console `127.0.0.1:9001`; bucket private.
- Web: `http://localhost:3000`. Admin: `http://localhost:3002`. API: `http://localhost:3001/api`.
  Swagger: `/api/docs`.
- API dùng global prefix `api`, CORS chỉ cho `WEB_ORIGIN` và `ADMIN_ORIGIN`, chặn request ghi
  từ origin khác.
- Dùng hostname `localhost` cho web/admin/API để chia sẻ cookie; `DATABASE_URL` dùng `127.0.0.1`.
  API chỉ bind IPv4 loopback nên server-side của admin dùng `API_URL=http://127.0.0.1:3001`.

## 3. Cấu trúc thư mục

```text
apps/web/src/app          Trang Next.js (App Router)
apps/web/src/components   Header, footer, product card, address selector...
apps/web/src/lib          api.ts (fetch wrapper), cart.ts (localStorage)
apps/api/src/admin        API quản trị catalog và đơn (admin)
apps/api/src/auth         Đăng ký/đăng nhập, session, Google OAuth, AdminGuard
apps/api/src/recipients   Hồ sơ người nhận
apps/api/src/catalog      Danh mục, sản phẩm, biến thể, lọc
apps/api/src/locations    Proxy Province Open API v1/v2
apps/api/src/media        Avatar và media sản phẩm trên MinIO
apps/api/src/orders       Quote, tạo đơn, VNPAY, tồn kho, shipment
apps/api/src/ghn          GHN staging client
apps/api/src/recommendations  Gemini + hội thoại + validate gói quà
apps/api/prisma           Schema và migration đã commit
scripts                   setup-env.mjs, seed-catalog.mjs, promote-admin.mjs
specs                     Đặc tả tính năng
docs                      Product, architecture, tasks, project-context
```

Repo `How2choose-admin`: `src/app` (login, dashboard, categories, products, orders),
`src/components`, `src/lib` (API client, server-side cookie forwarding, types, format),
`proxy.ts` (chặn thiếu cookie phiên), `next.config.ts` (security headers, noindex).

## 4. Module và endpoint chính của API

| Module | Endpoint / chức năng |
| --- | --- |
| Health | `GET /api/health`, `GET /api/health/ready` |
| Auth | `POST /auth/register`, `/login`, `/logout`; `GET/PATCH /auth/me`; `GET/POST /auth/me/address`; `GET /auth/providers`; `GET /auth/google/start`, `/auth/google/callback` |
| Recipients | `GET/POST /recipients`; `GET/PATCH /recipients/:id` — tất cả qua `SessionGuard` |
| Catalog | `GET /catalog/categories`; `GET /catalog/products`; `GET /catalog/products/:slug` |
| Locations | `GET /locations/provinces`, `/districts`, `/wards`, `/current-from-legacy` |
| Media | Avatar: `GET/POST/DELETE /media/avatar`; recipient avatar: `POST /media/recipients/:id/avatar`; product/variant media; upload sản phẩm cần `ADMIN` |
| Admin | `POST /admin/auth/login`, `/logout`; `GET /admin/auth/me`; `GET /admin/summary`; CRUD `/admin/categories`, `/admin/products`, `/admin/variants`; `POST /admin/media/reorder`; `GET /admin/orders`, `GET /admin/orders/:id`; `POST /admin/orders/:id/shipment/retry` — tất cả qua `SessionGuard` + `AdminGuard` |
| Orders | `POST /orders/quote`; `POST /orders`; `GET /orders`; `GET /orders/:id`; `POST /orders/:id/cancel`; `POST /orders/:id/shipment/retry` |
| Payments | `GET /payments/vnpay/ipn`, `/payments/vnpay/return` — không dùng `SessionGuard` |
| Recommendations | `POST /recommendations`; `GET /recommendations/conversation?recipientId=...&before=...` |

`apps/api/src/app.module.ts` ghép các module; `setup.ts` cấu hình CORS, ValidationPipe
(`whitelist`, `forbidNonWhitelisted`, `transform`) và Swagger.

## 5. Mô hình dữ liệu (Prisma)

- `User`: email/phone/googleSub unique; passwordHash scrypt; role `USER|ADMIN`; displayName;
  birthday; avatarObjectKey; địa chỉ giao hàng mặc định dạng cột phẳng.
- `Session`: tokenHash SHA-256 unique, expiresAt (storefront 30 ngày, admin 7 ngày), cascade theo user.
- `Recipient`: ownerId, displayName, phone, relationship, birthday, interests[], dislikes[],
  notes, avatar, địa chỉ có cấu trúc. Tên trùng được phép.
- `RecommendationConversation` / `RecommendationMessage`: owner/recipient, occasion, budgetVnd;
  message role `USER|ASSISTANT`, bundles JSON.
- `RecommendationRequest`: unique owner + idempotency key, request hash, response JSON.
- `Category` tự tham chiếu; `ProductCategory` nhiều-nhiều.
- `Product`: slug unique, giá, tồn, tags, brand/supplier, shippingRegions, purchaseCount,
  ratingAverage/Count, giảm giá % và số tiền, active.
- `ProductVariant`: SKU unique, thuộc tính màu/size/chất liệu, giá, tồn, đóng gói
  (gram + 3 chiều cm), giảm giá riêng, active, media.
- `ProductMedia`: gắn product và/hoặc variant; objectKey unique; IMAGE/VIDEO.
- `Order`: orderNumber unique, snapshot người nhận/địa chỉ, tiền, kiện hàng, GHN
  service type, expiresAt, idempotencyKey + requestHash, shipmentStatus, ghnOrderCode.
  Unique `(ownerId, idempotencyKey)`.
- `OrderItem`: snapshot product/variant/tên/SKU/giá gốc/giảm giá/giá cuối/số lượng/kích thước.
- `PaymentAttempt`: 1-1 với Order; txnRef unique; gatewayTransactionNo unique; VNPAY_SANDBOX.
- Trạng thái đơn: `PENDING_PAYMENT`, `PAID`, `PAYMENT_FAILED`, `CANCELLED`, `EXPIRED`,
  `PAYMENT_REVIEW`.

## 6. Quy tắc nghiệp vụ và bảo mật

### Tài khoản và phiên
- Email hoặc SĐT + mật khẩu; SĐT nội địa 10 số bắt đầu bằng 0 được chuẩn hóa `+84`.
- Mật khẩu scrypt với salt riêng; DB không lưu mật khẩu rõ.
- Session token ngẫu nhiên; DB chỉ lưu hash; cookie HttpOnly, SameSite=Lax, Secure khi production.
- Admin dùng chung cơ chế phiên nhưng TTL 7 ngày; chỉ `role = ADMIN` được tạo phiên qua
  `/api/admin/auth/login`. Sai thông tin và tài khoản thường đều trả 401 chung, không tạo cookie.
- Storefront và admin chia sẻ cookie khi cùng tên miền cha; production đặt `COOKIE_DOMAIN` nếu
  chạy trên các subdomain. Admin và API khác site hoàn toàn sẽ không dùng được SameSite=Lax.
- Google dùng `sub` đã xác thực; **không tự động liên kết theo email**.
- Mọi truy vấn hồ sơ/đơn/gợi ý lấy owner từ session, không nhận `ownerId` từ client.

### Catalog và giá
- Giá hiệu lực = giá gốc − giảm % (làm tròn) − giảm tiền cố định, tối thiểu 0 VND.
- Biến thể có giảm giá riêng thì ưu tiên, nếu không dùng giảm giá sản phẩm.
- Vùng giao: `ALL`, `HN`, `HCM`, `DN`; API nhận thêm `v1:{code}`/`v2:{code}`.
- Lọc giá/tìm kiếm/vùng thực hiện ở API; chỉ phân trang sau khi lọc.
- `Product.stock` không phải kho thứ hai khi tạo đơn; dùng `ProductVariant.stock`.

### Quản trị catalog (admin)
- Sản phẩm mới luôn là nháp; xuất bản cần ≥1 biến thể hoạt động, biến thể đủ cân nặng/kích thước
  đóng gói và ≥1 danh mục hoạt động.
- Tồn kho sản phẩm được đồng bộ bằng tổng tồn biến thể hoạt động; không cho tắt/xóa biến thể
  hoạt động cuối cùng của sản phẩm đang bán.
- Ngừng bán sản phẩm thay vì xóa cứng. Biến thể đã có trong đơn chỉ được tạm ẩn.
- Ẩn danh mục bị chặn khi còn danh mục con hoặc sản phẩm đang bán; xóa cứng chỉ khi danh mục rỗng.
- Đơn hàng trong admin chỉ đọc; chỉ thao tác được là tạo lại vận đơn GHN khi đơn đã thanh toán.

### Đơn hàng và thanh toán
- Quote ký HMAC-SHA256 (`quoteToken`) hạn 5 phút, ràng buộc owner + fingerprint dữ liệu.
- Tạo đơn bắt buộc `Idempotency-Key`; cùng key + cùng payload trả đơn cũ, khác payload → 409.
- Giữ tồn kho bằng `updateMany` có điều kiện trong transaction; trả kho đúng một lần khi
  hủy/hết hạn/thất bại. Có timer dọn đơn hết hạn mỗi 60 giây.
- Giữ hàng 15 phút; client không được gửi giá/tổng tiền.
- IPN xác thực chữ ký HMAC-SHA512, merchant, số tiền, mã giao dịch; cập nhật idempotent.
- Callback thành công đến muộn → `PAYMENT_REVIEW`, không tự chuyển `PAID`.
- Chỉ IPN hợp lệ mới tạo vận đơn GHN; retry dùng `client_order_code` để tránh trùng.
- GHN quote hiện chỉ nhận địa chỉ legacy (cần district/ward cũ); phí shop trả nhưng cộng vào
  tổng VNPAY.

### AI recommendation
- Ngân sách 50.000–20.000.000 VND; occasion thuộc danh sách cố định; request ≤500 ký tự;
  `idempotencyKey` tùy chọn ≤100 ký tự. Web dùng cùng khoảng ngân sách với API.
- Chỉ gửi relationship, birthday, interests, dislikes, notes (≤500) cho Gemini;
  không gửi tên/SĐT/địa chỉ/avatar.
- Tối đa 100 sản phẩm, 8 biến thể/sản phẩm, 3 gói, 5 món/gói; tổng từng gói ≤ ngân sách.
- Candidates lọc theo khu vực giao hàng của người nhận khi hồ sơ có địa chỉ có cấu trúc:
  mã tỉnh 1/79/48 → `HN`/`HCM`/`DN` (`regionTokenForProvince`), mã khác → `v1:/v2:` khớp
  cột `shippingRegions`; sản phẩm `ALL` luôn đủ điều kiện; không có địa chỉ thì không lọc.
- Gemini trả JSON theo `responseSchema`; API kiểm tra cấu trúc và xác thực lại
  productId/variantId/quantity/stock/giá với catalog; gói sai hoặc sản phẩm vừa bị tắt bị loại.
- Output bị cắt (`MAX_TOKENS`) hoặc bị safety filter chặn trả lỗi riêng, không phải lỗi parse chung.
- Gọi lặp cùng `idempotencyKey` trả lại response đã lưu, không gọi Gemini lần hai; payload khác
  với cùng key trả 409. Bảng `RecommendationRequest` giữ response theo owner/key.
- Rate limit: 5 POST/phút/tài khoản; 60 request/phút cho các route còn lại của controller.
- Hội thoại lưu PostgreSQL theo owner/recipient; tải 20 tin mới nhất, phân trang tin cũ.
  Snapshot gói lưu media ID và được ký lại URL khi đọc lịch sử.
- `DELETE /api/recommendations/conversation?recipientId=` xóa mọi hội thoại của hồ sơ thuộc owner;
  web có "Hội thoại mới" (bắt đầu hội thoại mới) và "Xóa lịch sử" (có confirm).
- Thêm giỏ từ gợi ý: web revalidate giá/biến thể/tồn qua `GET /api/catalog/products/:slug`,
  bỏ món hết hàng/ngừng bán, offline mới dùng snapshot; có nút thêm từng món.
- Không có biến thể phù hợp → trả danh sách gói rỗng, không gọi Gemini.
- `GEMINI_API_KEY` và `GEMINI_MODEL` chỉ ở server; `_` trong tên model được đổi thành `-`.
- Chi tiết lỗi provider được log server-side; response chỉ kèm chi tiết ngoài production.

### Media
- Avatar: JPEG/PNG/WebP ≤5 MB; product: ảnh ≤10 MB, MP4/WebM ≤100 MB.
- Object key do server tạo; DB lưu key + metadata, binary ở MinIO.
- Presigned URL mặc định hết hạn sau 15 phút.
- Chỉ chủ tài khoản đổi avatar; chỉ `ADMIN` đổi media sản phẩm.
- Media cấp sản phẩm (`variantId = null`) dùng làm ảnh bìa và ảnh dự phòng khi biến thể chưa có
  ảnh; media biến thể vẫn ưu tiên trong gallery và giỏ hàng.

## 7. Frontend hiện có

Trang: `/`, `/login`, `/register`, `/recipients`, `/recipients/[id]`, `/profile`,
`/recommendations`, `/catalog`, `/catalog/[slug]`, `/cart`, `/checkout`.

- `lib/api.ts`: `api()` gọi `NEXT_PUBLIC_API_URL` + `/api`, `credentials: 'include'`, chuẩn hóa lỗi.
- `lib/cart.ts`: giỏ hàng `localStorage` key `how2choose-cart`, event `how2choose-cart-updated`; giá
  trong giỏ chỉ để hiển thị.
- Header có tìm kiếm, nav, avatar/tên, icon giỏ hàng.
- Checkout: chọn hồ sơ người nhận, nạp sẵn tên/SĐT/địa chỉ, quote GHN, tạo đơn, chuyển VNPAY,
  hiển thị trạng thái, xóa món đã đặt khỏi giỏ, retry shipment.
- Recommendations: chọn hồ sơ/dịp/ngân sách, chat, tải tin cũ, thêm cả gói vào giỏ.
- UI dùng client components; 401 chuyển về `/login`.

### Giao diện quản trị (repo riêng)
- Repo `How2choose-admin`, cổng 3002: `/login`, `/`, `/categories`, `/products`, `/products/new`,
  `/products/[id]`, `/orders`, `/orders/[id]`.
- Server component đọc cookie `htc_session`, gọi `/api/admin/auth/me`; `proxy.ts` chặn sớm khi
  thiếu cookie, layout redirect `/login` khi không phải admin.
- `src/lib/server-api.ts` chuyển tiếp đúng cookie và dùng `API_URL` (mặc định
  `http://127.0.0.1:3001`); `src/lib/api.ts` dùng `NEXT_PUBLIC_API_URL` cho trình duyệt.
- Giao diện tiếng Việt, VND, không index (`robots`, `X-Robots-Tag`, security headers).
- Đơn hàng chỉ đọc; nút tạo lại vận đơn chỉ hiện khi đơn `PAID` và vận đơn chưa `CREATED`.

## 8. Trạng thái tính năng

Đã có:
- Workspace, CI, health, Swagger, lint/typecheck/test/build.
- Auth email/SĐT + session cookie + Google OAuth (mã nguồn).
- Hồ sơ người nhận, profile cá nhân, địa chỉ mặc định, avatar.
- MinIO + media sản phẩm/biến thể + presigned URL.
- Catalog seed, danh mục nhiều cấp, lọc/tìm kiếm/vùng/giá/đánh giá.
- Locations v1/v2, bộ chọn địa chỉ.
- Giỏ hàng localStorage.
- AI recommendation Gemini + hội thoại + validate.
- Orders, quote GHN staging, VNPAY sandbox, IPN idempotent, shipment sau thanh toán.
- API admin: đăng nhập riêng, tổng quan, CRUD danh mục/sản phẩm/biến thể, media, đơn chỉ đọc,
  tạo lại vận đơn; giao diện admin ở repo riêng.

Chưa xong / còn mở:
- Xác minh email/SMS, quên mật khẩu, rate limiting trước khi mở đăng ký công khai.
- Liên kết Google với tài khoản local sau xác minh.
- Chính sách xóa hồ sơ khi đã có lịch sử quà.
- Xác nhận "đã tặng" và loại trừ quà cũ khỏi gợi ý.
- Playwright cho luồng chính, deploy demo, README portfolio.
- Quản lý người dùng/vai trò, audit log, 2FA và thao tác hàng loạt trong admin.
- Kiểm thử thật Google/GHN/VNPAY cần credentials; GHN mới hỗ trợ địa chỉ legacy.
- Package profile seed là số liệu ước lượng, không dùng cho fulfillment thật.
- `npm audit` còn 6 cảnh báo moderate: chuỗi phụ thuộc của `minio` (query-string, stream-json,
  decode-uri-component) và `js-yaml` mà `@nestjs/swagger` ghim. Các bản vá high (multer,
  body-parser) và fast-uri đã được áp dụng; xem mục 9.

## 9. Chạy local và kiểm tra

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run db:up
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run db:generate
npm.cmd run dev
```

- `npm run check`: lint + typecheck + API tests.
- `npm run build`: build API và web.
- `npm run db:validate`: kiểm tra schema.
- `npm run db:migrate -- --name ten_thay_doi`: tạo migration mới.
- `npm run db:deploy`: áp dụng migration đã commit.
- `npm run db:seed`: nạp catalog mẫu, chạy lại an toàn.
- `npm run admin:promote -- "email-hoặc-sđt"`: cấp quyền admin (xem `specs/admin.md`).
- Admin repo riêng: `npm install`, `npm run dev` (cổng 3002), `npm run check`/`build`.
- CI: PostgreSQL 17 service, `npm ci → setup → db:generate → db:validate → db:deploy → check → build`.

Lưu ý:
- Windows: API dev không dùng Nest watch; sửa code API thì Ctrl+C và chạy lại `npm run dev`.
- Nếu endpoint mới trả `Cannot GET` trong khi health vẫn chạy, thường còn tiến trình API cũ ở cổng 3001.
- `npm run setup` chỉ tạo file env còn thiếu, không ghi đè.
- Không chạy hai API cùng lúc trên cổng 3001.
- API bind `127.0.0.1`; nếu Node gọi `localhost` bị `fetch failed` (IPv6), dùng `127.0.0.1`.
- Chạy `npm install`, `npm audit fix` và các script npm ở thư mục gốc repo. Chạy trong
  `apps/api` sẽ lỗi ERESOLVE vì `@nestjs/platform-express` được khai báo ở cả root lẫn
  workspace; đây là lý do root giữ dependency này.
- Bản vá bảo mật phụ thuộc: `multer` ghim 2.5.0 qua `overrides` (platform-express 11.2.7 ghim
  2.4.0); `body-parser` và `fast-uri` được `npm audit fix` nâng trong khoảng semver.
  `js-yaml` của `@nestjs/swagger` và chuỗi `minio` chưa có bản vá không phá vỡ tương thích.

## 10. Biến môi trường chính

API (`apps/api/.env`):
- `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `ADMIN_ORIGIN`, `COOKIE_DOMAIN`, `NODE_ENV`.
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- MinIO: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`,
  `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MEDIA_URL_TTL_SECONDS`.
- GHN: `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_FROM_DISTRICT_ID`, `GHN_REQUIRED_NOTE`.
- VNPAY: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `API_PUBLIC_URL`, `VNPAY_IPN_URL`
  (hai URL phải HTTPS công khai).
- `ORDER_QUOTE_SECRET` (production phải ≥32 ký tự).
- AI: `GEMINI_API_KEY`, `GEMINI_MODEL`.

Web (`apps/web/.env.local`):
- `NEXT_PUBLIC_API_URL=http://localhost:3001`, `API_URL=http://localhost:3001`.

Admin (`How2choose-admin/.env.local`):
- `NEXT_PUBLIC_API_URL=http://localhost:3001` (trình duyệt), `API_URL=http://127.0.0.1:3001`
  (server), `NEXT_PUBLIC_STORE_URL=http://localhost:3000`.

`ADMIN_ORIGIN` và `COOKIE_DOMAIN` chỉ đặt ở API; không đưa secret vào biến `NEXT_PUBLIC_*`, log,
response hoặc Git.

## 11. Quy ước làm việc

- Business logic và truy cập DB nằm ở API; web chỉ hiển thị và gọi API.
- Giao diện admin là repo Git riêng, chỉ gọi `/api/admin`; không truy cập DB/MinIO trực tiếp.
- Giữ một backend modular; chỉ thêm dependency khi tính năng cụ thể cần.
- Dùng migration đã commit; không reset DB để sửa lỗi thông thường.
- Mỗi task tập trung; cập nhật `docs/tasks.md` và spec liên quan khi hành vi thay đổi.
- Không tự quyết định câu hỏi sản phẩm còn mở ảnh hưởng hành vi người dùng.
- Phân biệt rõ kiểm thử mocked với kiểm thử tích hợp thật.
- Chạy `npm run db:generate` trước build/typecheck lần đầu.
- Với thay đổi schema: chạy `npm run db:validate` và tạo migration.
- Với thay đổi ứng dụng: chạy `npm run check` và `npm run build`.
- Không commit secret hoặc output Prisma generated.

## 12. Bản đồ tài liệu

- `docs/product.md` — phạm vi và quy tắc sản phẩm.
- `docs/architecture.md` — quyết định kỹ thuật.
- `docs/tasks.md` — tiến độ và việc tiếp theo.
- `specs/authentication.md` — đăng nhập, phiên, Google.
- `specs/recipient-profile.md` — hồ sơ người nhận.
- `specs/ai-recommendations.md` — luồng AI và an toàn.
- `specs/orders.md` — checkout, đơn, tồn kho, GHN, VNPAY.
- `specs/admin.md` — đăng nhập admin, catalog CRUD, media, đơn chỉ đọc.
- `AGENTS.md` — hướng dẫn bắt buộc cho agent.
- `apps/api/prisma/schema.prisma` — nguồn chân lý của dữ liệu.
