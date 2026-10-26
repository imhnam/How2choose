# How2choose

### Chọn quà hợp ý, không còn đoán mò.

How2choose là web app giúp người dùng chọn quà dựa trên hồ sơ người nhận, dịp tặng và ngân
sách. Thay vì tự lướt catalog và đoán, người dùng lưu sở thích của từng người, nhận các gói quà
do AI đề xuất từ sản phẩm còn hàng, rồi đặt mua trong cùng một luồng.

**Trạng thái:** MVP đang phát triển · Next.js 16.4.3 · NestJS 11 · PostgreSQL 17 · Prisma 7

---

## Vì sao có How2choose?

Chọn quà khó không phải vì thiếu sản phẩm, mà vì thiếu ngữ cảnh:

- Mỗi người có sở thích, điều không thích và dịp quan trọng khác nhau.
- Ngân sách thay đổi theo từng lần tặng.
- Dễ mua trùng món đã tặng hoặc chọn món hợp gu người mua hơn người nhận.
- Catalog lớn khiến việc tự lọc theo giá, tồn kho và khu vực giao hàng mất thời gian.

How2choose đặt **hồ sơ người nhận** làm trung tâm, dùng AI để thu hẹp lựa chọn và dùng catalog
làm nguồn dữ liệu duy nhất cho giá, tồn kho và sản phẩm.

## Điểm nổi bật

**Gợi ý có căn cứ, không phải chatbot tự do.** AI chỉ được chọn trong danh sách sản phẩm và biến
thể còn hàng do backend cung cấp. Mọi ID, giá, tồn kho và tổng tiền đều được kiểm tra lại trước
khi hiển thị.

**Cá nhân hóa theo từng người nhận.** Quan hệ, ngày sinh, sở thích, điều không thích và ghi chú
được dùng làm ngữ cảnh. Tên, số điện thoại, địa chỉ và avatar không gửi cho model.

**Luồng mua hàng hoàn chỉnh.** Từ gói quà được gợi ý, người dùng thêm vào giỏ, nhận báo giá vận
chuyển, tạo đơn, thanh toán sandbox và theo dõi trạng thái đơn.

**Dữ liệu luôn thuộc về chủ tài khoản.** Hồ sơ, hội thoại và đơn hàng đều được truy vấn theo
owner lấy từ phiên đăng nhập, không nhận `ownerId` từ client.

**Sẵn sàng cho luồng thương mại thật.** Đơn hàng có giữ tồn kho, idempotency, xác thực callback
và trạng thái xử lý thủ công khi thanh toán đến muộn.

## Một lượt sử dụng

1. **Tạo hồ sơ người nhận** — lưu tên, quan hệ, sở thích, điều không thích, ngày sinh và địa chỉ.
2. **Chọn dịp và ngân sách** — sinh nhật, kỷ niệm, lễ tết, cảm ơn hoặc dịp khác.
3. **Trao đổi với trợ lý** — AI trả tối đa ba gói quà thay thế, mỗi gói có thể gồm nhiều món.
4. **Thêm cả gói vào giỏ** — giữ nguyên số lượng và biến thể đã được gợi ý.
5. **Checkout** — xác nhận giá, tồn kho, phí vận chuyển và thông tin người nhận.
6. **Thanh toán và theo dõi** — đơn được giữ hàng 15 phút, cập nhật sau khi cổng thanh toán xác
   nhận và tạo vận đơn khi thanh toán hợp lệ.

> Xác nhận "đã tặng" và lịch sử quà là hạng mục tiếp theo, chưa có trong bản MVP hiện tại.

## Kiến trúc

```text
Người dùng
   │
   ▼
Next.js 16 (App Router, React 19)
   │  REST + cookie HttpOnly
   ▼
NestJS 11 API
   ├── PostgreSQL 17 + Prisma 7      Tài khoản, hồ sơ, catalog, đơn hàng, hội thoại
   ├── MinIO                          Avatar và media sản phẩm
   ├── Google Gemini                  Gợi ý quà có kiểm soát
   ├── Province Open API              Tỉnh/huyện/xã theo địa giới cũ và mới
   ├── GHN staging                    Báo phí và tạo vận đơn
   └── VNPAY sandbox                  Thanh toán và IPN
```

Backend sở hữu toàn bộ business logic và truy cập dữ liệu. Web chỉ hiển thị, thu thập input và
gọi API; giá, tồn kho và trạng thái đơn không bao giờ được tin từ trình duyệt.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js 16.4.3, React 19, Tailwind CSS 4, TypeScript |
| Backend | NestJS 11, Prisma 7, PostgreSQL 17 |
| Lưu trữ file | MinIO, presigned URL |
| AI | Google Gemini |
| Vận chuyển | GHN staging |
| Thanh toán | VNPAY sandbox |
| Hạ tầng local | Docker Compose, npm workspaces |

## Những quyết định kỹ thuật đáng chú ý

### AI không được tin tưởng mù quáng

Gemini trả về JSON theo schema cố định, nhưng kết quả chỉ được xem là đề xuất. Backend kiểm tra
lại từng cặp sản phẩm/biến thể, số lượng, tồn kho, giá hiệu lực và tổng tiền của từng gói. Gói
sai hoặc vượt ngân sách bị loại bỏ; nếu không có lựa chọn hợp lệ, API trả danh sách rỗng thay vì
tạo gợi ý giả.

Nội dung hồ sơ, catalog và tin nhắn được xem là dữ liệu, không phải chỉ dẫn hệ thống. Điều này
giảm rủi ro prompt injection từ dữ liệu người dùng hoặc mô tả sản phẩm.

### Tồn kho và thanh toán có thể tin được

- Báo giá được ký HMAC và hết hạn sau 5 phút.
- Tạo đơn dùng `Idempotency-Key`; gửi lại cùng key không tạo đơn trùng.
- Tồn kho được giữ bằng cập nhật có điều kiện trong transaction, tránh hai người mua vượt số
  lượng còn lại.
- Đơn hết hạn sau 15 phút và được dọn tự động.
- IPN được xác thực chữ ký, mã merchant, số tiền và mã giao dịch; callback lặp không cộng tiền
  hoặc trừ kho lần nữa.
- Thanh toán thành công đến sau khi đơn đã hủy/hết hạn được đưa vào `PAYMENT_REVIEW`, không tự
  đánh dấu `PAID`.

### Phiên và quyền sở hữu

Mật khẩu được băm bằng scrypt với salt riêng. Session token ngẫu nhiên được lưu dưới dạng hash
trong database; trình duyệt chỉ giữ token trong cookie HttpOnly. Google được nhận diện bằng
`sub` đã xác thực và không tự động liên kết với tài khoản email/mật khẩu trùng email.

### Media và địa giới

Ảnh/video được lưu trong bucket private; database chỉ giữ object key và metadata. API cấp
presigned URL có thời hạn và chỉ admin mới được thay đổi media sản phẩm.

Địa chỉ hỗ trợ cả địa giới trước và sau 01/07/2025. API địa giới được cache để giảm phụ thuộc
vào nhà cung cấp bên ngoài.

## Trạng thái dự án

**Đã có**

- Đăng ký/đăng nhập email hoặc số điện thoại, phiên cookie và Google OAuth.
- Hồ sơ người nhận, trang cá nhân, avatar và địa chỉ mặc định.
- Catalog nhiều cấp, biến thể, media, giảm giá, tìm kiếm và bộ lọc.
- Gợi ý quà bằng Gemini, lưu hội thoại theo người nhận.
- Giỏ hàng, checkout, báo giá GHN staging, VNPAY sandbox và quản lý đơn.
- MinIO, presigned URL và phân quyền upload media.
- CI chạy lint, typecheck, test, migrate và build.

**Tiếp theo**

- Xác nhận "đã tặng" và lịch sử quà để tránh gợi ý trùng.
- Xác minh email/SMS, quên mật khẩu và rate limiting cho đăng nhập/đăng ký trước khi mở đăng ký công khai.
- Trang admin CRUD catalog và quản lý media theo biến thể.
- Playwright cho luồng chính, demo deploy và GHN/VNPAY production.

## Giới hạn hiện tại

- Chỉ dùng GHN staging và VNPAY sandbox; chưa có giao dịch thật.
- GHN quote chỉ hỗ trợ địa chỉ theo địa giới cũ.
- Giỏ hàng lưu ở trình duyệt, chưa đồng bộ theo tài khoản.
- Cân nặng/kích thước đóng gói trong dữ liệu seed là ước lượng.
- Chưa có xóa hồ sơ người nhận vì chính sách lịch sử quà chưa được chốt.
- Một số cảnh báo `npm audit` ở dependency API cần tiếp tục theo dõi.
- Rate limit của API lưu trong bộ nhớ tiến trình; khi chạy nhiều instance cần cấu hình storage dùng chung (ví dụ Redis).

## Tài liệu

- [`docs/product.md`](docs/product.md) — phạm vi và quy tắc sản phẩm.
- [`docs/architecture.md`](docs/architecture.md) — quyết định kiến trúc.
- [`docs/tasks.md`](docs/tasks.md) — tiến độ và việc tiếp theo.
- [`docs/project-context.md`](docs/project-context.md) — bản đồ codebase cho thành viên và agent.
- [`specs/authentication.md`](specs/authentication.md) — đăng nhập, phiên, Google.
- [`specs/recipient-profile.md`](specs/recipient-profile.md) — hồ sơ người nhận.
- [`specs/ai-recommendations.md`](specs/ai-recommendations.md) — luồng AI và an toàn dữ liệu.
- [`specs/orders.md`](specs/orders.md) — checkout, tồn kho, GHN và VNPAY.

## Chạy thử

Yêu cầu: Node.js 22.12+, npm 10+ và Docker Desktop.

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run db:up
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run db:generate
npm.cmd run dev
```

Web: <http://localhost:3000> · API: <http://localhost:3001/api> · Swagger:
<http://localhost:3001/api/docs>

Cấu hình Google, GHN, VNPAY, Gemini và biến môi trường chi tiết nằm trong
[`docs/project-context.md`](docs/project-context.md) và các file `.env.example`.
