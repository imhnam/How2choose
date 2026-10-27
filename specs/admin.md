# Admin — quản trị catalog và đơn hàng

> Trạng thái: MVP đã có mã nguồn và kiểm thử tích hợp với PostgreSQL. Giao diện admin nằm ở
> repo riêng (`How2choose-admin`), không nằm trong workspace này.

## 1. Phạm vi

Trang quản trị dành cho tài khoản `ADMIN`, giao diện tiếng Việt, tiền VND:

- Đăng nhập/đăng xuất riêng cho admin, phiên 7 ngày.
- Tổng quan: doanh thu 30 ngày (đơn `PAID`), số sản phẩm, đơn chờ thanh toán/cần kiểm tra,
  tồn kho thấp, đơn gần đây.
- Danh mục: tạo, sửa, ẩn (archive), xóa cứng khi danh mục rỗng.
- Sản phẩm: danh sách có lọc/tìm kiếm/phân trang, tạo nháp, sửa, xuất bản, ngừng bán.
- Biến thể: thêm/sửa/xóa (hoặc tạm ẩn) theo sản phẩm; giá, tồn kho và đóng gói ở cấp biến thể.
- Media: ảnh/video chung của sản phẩm và theo biến thể, sắp xếp thứ tự, xóa.
- Đơn hàng: chỉ đọc, lọc/tìm kiếm, xem chi tiết, tạo lại vận đơn GHN khi đủ điều kiện.

Ngoài phạm vi MVP: quản lý người dùng/vai trò, CMS, hoàn tiền, đánh giá, thao tác hàng loạt,
2FA và audit log.

## 2. Kiến trúc

- Business logic, truy cập DB, xác thực và media nằm trong API hiện tại (`apps/api`).
- API admin dùng global prefix `/api`, nhóm route `/api/admin`.
- Toàn bộ route admin (trừ `POST /admin/auth/login`) qua `SessionGuard` + `AdminGuard`.
- Repo admin chỉ là Next.js App Router gọi API; không truy cập PostgreSQL/MinIO trực tiếp.
- Server-side của admin đọc cookie `htc_session` và chuyển tiếp khi gọi API. Repo admin dùng
  `API_URL` (server) và `NEXT_PUBLIC_API_URL` (trình duyệt).

## 3. Xác thực và phiên

### Đăng nhập

`POST /api/admin/auth/login` với `{ identifier, password }`:

- Chỉ tài khoản `role = ADMIN` được tạo phiên. Sai mật khẩu, không tồn tại hoặc là `USER`
  đều trả `401` với cùng thông báo; **không** tạo cookie phiên.
- Session TTL 7 ngày (storefront 30 ngày). Cookie `htc_session`: HttpOnly, SameSite=Lax,
  Secure khi production.
- Giới hạn 10 lần/phút/IP cho endpoint đăng nhập.
- `GET /api/admin/auth/me` trả user hiện tại; `POST /api/admin/auth/logout` xóa phiên.

### Cookie và origin

- Cookie không phân biệt cổng, nên local có thể dùng chung `localhost` cho web (3000),
  admin (3002) và API (3001).
- API cho phép CORS và request ghi từ `WEB_ORIGIN` và `ADMIN_ORIGIN` (hỗ trợ danh sách phân
  tách bằng dấu phẩy). Origin khác bị chặn với `403`.
- Production: storefront và admin nên nằm trên các subdomain của cùng một tên miền cha; đặt
  `COOKIE_DOMAIN` (ví dụ `.how2choose.vn`) để cookie dùng chung. Nếu admin và API khác site
  hoàn toàn, SameSite=Lax sẽ chặn cookie và admin không đăng nhập được.
- Google Client Secret vẫn chỉ ở API; admin không có luồng liên kết Google.

### Cấp quyền quản trị

```powershell
npm run admin:promote -- "email-hoặc-sđt"
node scripts/promote-admin.mjs "email-hoặc-sđt" "--name=Tên hiển thị" "--password=Mật khẩu"
```

Script tạo tài khoản mới khi có `--name`, hoặc nâng tài khoản đã tồn tại lên `ADMIN` và đặt lại
mật khẩu. Chỉ chạy trên môi trường tin cậy; không đưa mật khẩu vào tài liệu hay Git.

## 4. API admin

| Method | Route | Chức năng |
| --- | --- | --- |
| POST | `/api/admin/auth/login` | Đăng nhập admin |
| GET | `/api/admin/auth/me` | User admin hiện tại |
| POST | `/api/admin/auth/logout` | Đăng xuất |
| GET | `/api/admin/summary` | Số liệu tổng quan |
| GET | `/api/admin/categories` | Danh sách danh mục (kèm số sản phẩm) |
| POST | `/api/admin/categories` | Tạo danh mục |
| PATCH | `/api/admin/categories/:id` | Sửa danh mục |
| DELETE | `/api/admin/categories/:id` | Ẩn; `?hard=true` xóa cứng nếu rỗng |
| GET | `/api/admin/products` | Danh sách: `page`, `limit`, `q`, `status`, `categoryId`, `sort` |
| POST | `/api/admin/products` | Tạo sản phẩm nháp |
| GET | `/api/admin/products/:id` | Chi tiết sản phẩm, biến thể, media |
| PATCH | `/api/admin/products/:id` | Sửa/xuất bản sản phẩm |
| DELETE | `/api/admin/products/:id` | Ngừng bán (archive) |
| POST | `/api/admin/products/:id/restore` | Xuất bản lại nếu đủ điều kiện |
| POST | `/api/admin/products/:id/variants` | Thêm biến thể |
| PATCH | `/api/admin/variants/:id` | Sửa biến thể |
| DELETE | `/api/admin/variants/:id` | Xóa hoặc tạm ẩn biến thể đã có trong đơn |
| POST | `/api/admin/media/reorder` | Sắp xếp media trong cùng sản phẩm/biến thể |
| GET | `/api/admin/orders` | Danh sách đơn: `page`, `limit`, `q`, `status` |
| GET | `/api/admin/orders/:id` | Chi tiết đơn (không có `requestHash`, `idempotencyKey`, `ownerId`) |
| POST | `/api/admin/orders/:id/shipment/retry` | Tạo lại vận đơn GHN |

Media dùng các route hiện có: `POST /api/media/products/:productId`,
`POST /api/media/variants/:variantId`, `DELETE /api/media/products/items/:mediaId` — tất cả yêu cầu
`ADMIN`.

## 5. Quy tắc danh mục

- Tên 2–120 ký tự; slug tùy chọn, tự tạo từ tên nếu bỏ trống. Slug là duy nhất, chỉ gồm chữ
  thường, số và dấu gạch nối.
- Danh mục cha phải tồn tại; không thể là chính nó hoặc tạo chu trình.
- Ẩn danh mục bị chặn khi còn danh mục con đang hoạt động hoặc sản phẩm đang bán trong danh mục.
- `DELETE` mặc định chỉ ẩn (`active=false`). `?hard=true` chỉ xóa khi không có danh mục con và
  không có sản phẩm.

## 6. Quy tắc sản phẩm và biến thể

### Tạo và xuất bản

- Mọi sản phẩm mới đều ở trạng thái nháp (`active=false`); gửi `active=true` khi tạo trả `400`.
- Tồn kho sản phẩm được tính lại bằng tổng tồn của các biến thể đang hoạt động; `Product.stock`
  chỉ là giá trị tham chiếu, đơn hàng trừ tồn ở cấp biến thể.
- Xuất bản (`PATCH { active: true }` hoặc `POST /restore`) yêu cầu:
  - ít nhất một biến thể đang hoạt động;
  - mọi biến thể hoạt động có cân nặng và 3 chiều đóng gói > 0;
  - thuộc ít nhất một danh mục đang hoạt động.
- Không xuất bản được thì cả transaction bị hủy; sản phẩm giữ nguyên trạng thái trước đó.

### Xóa và lưu trữ

- `DELETE /products/:id` chỉ ngừng bán (`active=false`). Không xóa cứng sản phẩm để bảo toàn
  lịch sử đơn.
- `DELETE /variants/:id`:
  - chặn xóa biến thể hoạt động cuối cùng của sản phẩm đang bán;
  - nếu biến thể đã có trong `OrderItem`, chỉ tạm ẩn (`active=false`) và trả `{ archived: true }`;
  - nếu chưa có trong đơn, xóa DB và dọn media trên MinIO.
- SKU duy nhất toàn hệ thống: 2–64 ký tự, chữ in hoa/số/`. _ -`; API tự chuẩn hóa chữ hoa.

### Giá và giảm giá

- Giá niêm yết và giảm giá lưu ở sản phẩm và biến thể. Giá hiệu lực = giá gốc − giảm % (làm
  tròn) − giảm tiền, tối thiểu 0.
- Biến thể có giảm giá riêng thì dùng giảm giá biến thể; nếu không, dùng giảm giá sản phẩm.
- Không cho giảm vượt giá (kiểm tra server-side).

### Vùng giao hàng

- Chỉ nhận `ALL`, `HN`, `HCM`, `DN`; ít nhất một giá trị; `ALL` không kết hợp với giá trị khác.

## 7. Media

- Ảnh JPEG/PNG/WebP ≤10 MB; video MP4/WebM ≤100 MB; kiểm tra MIME và chữ ký file ở server.
- Media có thể gắn ở cấp sản phẩm (`variantId = null`) hoặc cấp biến thể.
- Ảnh sản phẩm dùng làm ảnh bìa/ảnh dự phòng khi biến thể chưa có ảnh; ảnh biến thể ưu tiên
  trong gallery và giỏ hàng.
- Sắp xếp lại chỉ trong cùng phạm vi sản phẩm hoặc cùng một biến thể.
- Presigned URL hết hạn sau 15 phút (cấu hình `MEDIA_URL_TTL_SECONDS`). UI admin không cache
  URL vĩnh viễn.

## 8. Đơn hàng

- Chỉ đọc: không có endpoint sửa trạng thái, giá hay địa chỉ đơn.
- Tìm theo mã đơn, tên người nhận, số điện thoại; lọc theo trạng thái; sắp xếp mới nhất trước.
- Hiển thị snapshot sản phẩm/giá/kiện hàng, thanh toán VNPAY, trạng thái vận đơn, người đặt.
- "Tạo lại vận đơn" chỉ khả dụng khi đơn `PAID` và vận đơn chưa `CREATED`; dùng lại
  `client_order_code` để tránh tạo trùng.
- Không trả `requestHash`, `idempotencyKey` hay `ownerId` trong response admin.

## 9. Giao diện admin

Repo riêng, Next.js 16.4.3 + React 19 + Tailwind 4, cổng 3002:

- `/login` — đăng nhập; lỗi 401 dùng thông báo chung, 429 báo chờ một phút.
- `/` — tổng quan, liên kết nhanh tới đơn/sản phẩm.
- `/categories` — bảng cây danh mục, tạo/sửa/ẩn tại chỗ.
- `/products` — lọc/tìm kiếm/phân trang; ảnh bìa lấy từ media sản phẩm hoặc biến thể.
- `/products/new` — tạo nháp; chọn danh mục và vùng giao.
- `/products/[id]` — sửa thông tin, quản lý biến thể, media, xuất bản/ngừng bán.
- `/orders`, `/orders/[id]` — chỉ đọc, có nút tạo lại vận đơn khi đủ điều kiện.

Bảo vệ: `proxy.ts` chặn khi thiếu cookie `htc_session`; layout server gọi `/admin/auth/me` và
redirect `/login` nếu không phải admin. Không dùng trang admin cho người dùng storefront.

## 10. Kiểm thử và giới hạn

- `apps/api/test/admin.spec.ts` kiểm thử tích hợp PostgreSQL: chặn người không phải admin,
  phiên admin, chặn origin lạ, tạo danh mục, nháp → biến thể → xuất bản, chặn ẩn danh mục còn
  sản phẩm, phân trang đơn.
- Repo admin: `npm run typecheck`, `npm run lint`, `npm run build` (CI riêng).
- Chưa kiểm thử thật upload MinIO khi container unhealthy; chưa có E2E Playwright cho admin.
- Chưa có phân quyền chi tiết hơn `ADMIN`, audit log hay 2FA.
