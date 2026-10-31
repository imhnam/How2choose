# Orders và checkout — bản đặc tả v0.1

## Mục tiêu và phạm vi

Cho phép người dùng đã đăng nhập chuyển các biến thể trong giỏ hàng thành một đơn hàng, xem lại giá, tồn kho và phí giao GHN do backend xác nhận, thanh toán qua VNPAY sandbox, rồi xem trạng thái đơn. GHN chỉ dùng môi trường staging; không thu tiền thật và không dùng cho vận chuyển production.

`apps/web/src/lib/cart.ts` hiện lưu giỏ hàng trong `localStorage`. Giá, tên, ảnh và tồn kho trong đó chỉ phục vụ hiển thị; backend không dùng chúng để tính đơn.

## Luồng người dùng

1. Từ giỏ hàng (chỉ các sản phẩm được chọn) hoặc “Mua ngay”, người dùng mở checkout. Nếu chưa đăng nhập, chuyển đến đăng nhập rồi quay về checkout.
2. Người dùng nhập thông tin nhận hàng, chọn địa chỉ theo địa giới cũ, xem danh sách biến thể, số lượng, tạm tính, phí GHN và tổng tiền do API trả về. Phí GHN được tính với bên trả cước là shop; phí vẫn được cộng vào tổng thanh toán VNPAY.
3. Nếu giá hoặc tồn kho đã đổi, checkout hiển thị giá trị mới và yêu cầu người dùng xác nhận lại trước khi tạo đơn. Mặt hàng không còn bán hoặc không giao được đến khu vực đã chọn phải được sửa/xóa khỏi giỏ.
4. Khi xác nhận, backend tạo đơn `PENDING_PAYMENT`, giữ số lượng hàng cho đơn và trả về mã đơn. Thao tác lặp do nhấp đôi hoặc lỗi mạng không tạo hai đơn.
5. Người dùng đi tới VNPAY sandbox. Backend xác thực kết quả thanh toán rồi cập nhật đơn. Trang chi tiết đơn đọc trạng thái từ backend; kết quả hiển thị từ URL trình duyệt không tự quyết định đơn đã thanh toán.
6. Sau khi đơn `PAID`, giao diện có thể xóa các biến thể đã đặt khỏi giỏ local. Người dùng có thể xem danh sách và chi tiết đơn của mình.

## Dữ liệu đầu vào checkout

- Mỗi dòng hàng gửi `variantId` và `quantity` là số nguyên dương. Backend giới hạn số dòng và số lượng mỗi dòng, gộp các dòng trùng `variantId` hoặc từ chối trùng theo một quy tắc thống nhất.
- Thông tin nhận hàng: `recipientName`, `phone`, `addressVersion` (`current` hoặc `legacy`), `provinceCode`, `wardCode`, `addressLine`; `districtCode` bắt buộc với `legacy` và không dùng với `current`; `deliveryNote` không bắt buộc. Lưu snapshot tên tỉnh, huyện (nếu có), xã/phường cùng mã và phiên bản địa giới trên đơn. Các chuỗi được trim, giới hạn độ dài và kiểm tra định dạng ở API. `recipientName` là người nhận kiện hàng, không mặc định là hồ sơ người nhận quà của tính năng AI.
- Danh sách địa giới lấy qua API nội bộ `/api/locations` từ Province Open API: v1 trước 01/07/2025 (63 tỉnh/thành, ba cấp), v2 sau sáp nhập (34 tỉnh/thành, hai cấp). API orders phải xác thực mã và quan hệ cha-con lúc tạo đơn; không tin tên do trình duyệt gửi. Có endpoint đối chiếu phường/xã cũ sang mới nhưng có thể có nhiều kết quả, vì vậy không tự động chọn một kết quả khi mơ hồ.
- `recipientProfileId` có thể để trống. Nếu có, backend kiểm tra hồ sơ thuộc tài khoản đang đăng nhập; liên kết này chỉ phục vụ lịch sử quà sau này, không tự đánh dấu “đã tặng”.
- Client không gửi `unitPrice`, `discount`, `subtotal`, `shippingFee` hoặc `total` để backend tin dùng. Nếu client gửi các trường này, API từ chối.
- Thanh toán giai đoạn đầu chỉ có `VNPAY_SANDBOX`.
- GHN dùng staging endpoint; token và shop ID chỉ cấu hình ở API. Chỉ tạo vận đơn sau IPN VNPAY hợp lệ, với `payment_type_id=1` (shop trả phí), `cod_amount=0` và `client_order_code` là mã đơn nội bộ.
- GHN fee API hiện yêu cầu mã quận/huyện và phường/xã thuộc danh mục cũ. Checkout GHN vì vậy chỉ chấp nhận `addressVersion=legacy`; địa chỉ mới không được quy đổi tự động.
- Mỗi biến thể phải có khối lượng (gram) và kích thước đóng gói (cm). Tổng cân nặng tính theo số lượng; kiện nhẹ gộp bằng kích thước dài/rộng lớn nhất và tổng chiều cao. Hàng từ 20 kg dùng `service_type_id=5` và `items[]`; tuyến phải có dịch vụ tương ứng GHN trả về.

## Quy tắc giá, khu vực và tồn kho

- Chỉ nhận sản phẩm và biến thể `active`. Mỗi `variantId` phải thuộc sản phẩm còn bán. Giá hiệu lực của biến thể tính theo quy tắc catalog: giá gốc trừ giảm giá phần trăm rồi trừ giảm giá cố định, tối thiểu 0 VND. Toàn bộ số tiền lưu dạng số nguyên VND.
- `shippingRegions` của sản phẩm chứa `ALL` hoặc mã khu vực được chọn. Khu vực checkout phải khớp địa chỉ giao hàng. Dữ liệu seed hiện có mã `HN`, `HCM`, `DN`; catalog chấp nhận `v1:{provinceCode}` hoặc `v2:{provinceCode}` và ánh xạ ba mã tỉnh tương ứng. Các tỉnh khác hiện chỉ thấy sản phẩm `ALL`. Địa chỉ legacy được xác thực ở Province Open API rồi ánh xạ theo tên và hierarchy sang GHN; nếu không có đúng một kết quả khớp thì từ chối quote.
- API báo giá lại ngay trước khi tạo đơn. Tạo đơn và giữ tồn kho phải nằm trong một transaction; kiểm tra và giảm tồn kho có điều kiện để hai checkout đồng thời không vượt số lượng có sẵn.
- Quote trả về `quoteToken` có thời hạn ngắn, ràng buộc danh sách `variantId`/số lượng, khu vực, giá từng dòng và phí vận chuyển. Khi tạo đơn, API tính lại từ database rồi so với quote đã ký/xác thực. Nếu dữ liệu đổi, trả quote mới và yêu cầu xác nhận lại; không âm thầm tạo đơn ở giá khác.
- Mỗi `OrderItem` lưu snapshot `productId`, `variantId`, tên sản phẩm, SKU, tên biến thể/thuộc tính, đơn giá gốc, giảm giá áp dụng, đơn giá cuối và số lượng. Việc sửa catalog sau đó không làm đổi đơn cũ.
- `subtotalVnd` là tổng `unitPriceVnd × quantity`. `shippingFeeVnd` lấy từ GHN staging ở backend; `totalVnd = subtotalVnd + shippingFeeVnd`. Quote hết hạn sau 5 phút và được tính lại trước khi tạo đơn.
- Kích thước biến thể seed là ước lượng để thử staging, không phải thông số giao hàng thật. Cần thay bằng số đo thực trước khi dùng dữ liệu thương mại.
- `ProductVariant.stock` là nguồn tồn kho cho sản phẩm có biến thể. Trường `Product.stock` hiện có không được dùng như một kho thứ hai khi tạo đơn.

## Vòng đời đơn và thanh toán

| Trạng thái đơn | Ý nghĩa | Chuyển trạng thái hợp lệ |
| --- | --- | --- |
| `PENDING_PAYMENT` | Đã tạo đơn, đã giữ tồn kho, chờ thanh toán | `PAID`, `PAYMENT_FAILED`, `CANCELLED`, `EXPIRED`, `PAYMENT_REVIEW` |
| `PAID` | Gateway xác nhận thanh toán hợp lệ | Tạo vận đơn GHN staging; shipment có trạng thái riêng |
| `PAYMENT_FAILED` | Gateway báo thất bại; đã trả tồn kho | Trạng thái cuối; đặt lại bằng đơn mới |
| `CANCELLED` | Người dùng hủy trước khi thanh toán; đã trả tồn kho | `PAYMENT_REVIEW` nếu gateway báo thanh toán muộn |
| `EXPIRED` | Hết hạn giữ hàng/thanh toán; đã trả tồn kho | `PAYMENT_REVIEW` nếu gateway báo thanh toán muộn |
| `PAYMENT_REVIEW` | Gateway báo thành công sau khi đơn đã hủy/hết hạn hoặc dữ liệu thanh toán không khớp | Cần xử lý thủ công; không tự đánh dấu `PAID` |

- Giữ tồn kho tối đa 15 phút từ lúc tạo đơn. Có tác vụ định kỳ hoặc cơ chế tương đương để hết hạn đơn và trả tồn kho, kể cả khi người dùng không quay lại website.
- MVP cho phép một lần thử thanh toán cho mỗi đơn; nếu thất bại, người dùng tạo đơn mới. Mở lại thanh toán trên cùng đơn và nhiều `PaymentAttempt` sẽ được đặc tả riêng khi cần.
- Callback/IPN phải xác thực chữ ký, mã đơn, số tiền, trạng thái giao dịch và mã giao dịch gateway. Cập nhật payment, order và tồn kho trong transaction; ràng buộc duy nhất mã giao dịch để callback lặp không tăng lượt mua, trừ tồn kho hoặc đổi trạng thái lần nữa.
- Nếu callback thành công đến sau khi tồn kho đã được trả, lưu thông tin giao dịch và đưa đơn vào `PAYMENT_REVIEW`; không tự giữ lại hàng. Không lấy query redirect của trình duyệt làm bằng chứng thanh toán.
- Chỉ IPN hợp lệ mới kích hoạt GHN. Nếu tạo shipment lỗi sau khi đơn đã `PAID`, giữ trạng thái thanh toán, ghi `shipmentStatus=FAILED` và cho phép chủ đơn retry; dùng `client_order_code` để GHN không tạo vận đơn trùng.
- Thanh toán thành công (`PAID`), mua hàng và người dùng xác nhận “đã tặng” là các sự kiện khác nhau. Lịch sử quà chỉ coi là đã tặng sau hành động xác nhận riêng.

## Quyền truy cập và API dự kiến

- Tất cả endpoint checkout/đơn hàng của người mua yêu cầu phiên hợp lệ. `ownerId` luôn lấy từ phiên, không nhận từ body/query.
- `POST /api/orders/quote`: nhận các dòng hàng và khu vực giao hàng; trả giá/tồn kho/khu vực được xác nhận, lỗi theo dòng, tổng tiền và `quoteToken`. Chưa tạo đơn hoặc giữ hàng.
- `POST /api/orders`: nhận `quoteToken`, thông tin giao hàng và `Idempotency-Key`; tính lại giá, kiểm tra và giữ tồn kho rồi tạo đơn. Khu vực địa chỉ phải trùng khu vực trong quote.
- `GET /api/orders`: danh sách đơn của tài khoản, phân trang, mới nhất trước.
- `GET /api/orders/:id`: chi tiết đơn của chủ tài khoản; tài khoản khác nhận 404.
- `POST /api/orders/:id/cancel`: chỉ hủy đơn còn `PENDING_PAYMENT`; trả tồn kho đúng một lần.
- `POST /api/orders/quote`, `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel` và `POST /api/orders/:id/shipment/retry`.
- `GET /api/payments/vnpay/ipn` và `GET /api/payments/vnpay/return` không dùng SessionGuard. IPN xác thực HMAC-SHA512, merchant, transaction reference, số tiền, response/status code và mã giao dịch; Return URL chỉ xác minh chữ ký rồi điều hướng UI, không cập nhật thanh toán.
- API không trả secret, chữ ký gateway, token phiên hoặc dữ liệu nội bộ không cần cho UI.

## Dữ liệu dự kiến

- `Order`: ID, mã đơn hiển thị duy nhất, `ownerId`, trạng thái, snapshot địa chỉ và liên hệ giao hàng, tổng tiền, kích thước kiện/service GHN, trạng thái shipment/mã vận đơn và `expiresAt`.
- `OrderItem`: `orderId`, `productId`, `variantId`, snapshot tên/SKU/thuộc tính/giá và package dimensions, `quantity`, `lineTotalVnd`.
- `PaymentAttempt`: `orderId`, provider, mã giao dịch nội bộ duy nhất, mã giao dịch gateway duy nhất khi có, số tiền, trạng thái, thời điểm và dữ liệu callback cần để đối soát. Không lưu dữ liệu thẻ.
- Idempotency key được lưu theo `ownerId` và thao tác tạo đơn, gắn với hash của payload. Gửi lại cùng key và cùng payload trả về đơn cũ; cùng key với payload khác trả lỗi.

## Trường hợp lỗi cần hiển thị

- Giỏ hàng trống; biến thể không tồn tại/ngừng bán; số lượng vượt tồn kho; sản phẩm không giao đến khu vực đã chọn.
- Giá thay đổi từ lúc người dùng thêm vào giỏ; quote hết hiệu lực hoặc thay đổi trước khi tạo đơn.
- Chưa đăng nhập, phiên hết hạn, thông tin giao hàng sai, mã hồ sơ người nhận không thuộc tài khoản.
- Hết hạn thanh toán, gateway thất bại, callback lặp, callback sai chữ ký/sai số tiền, thành công đến sau khi đơn đã hết hạn.
- Lỗi mạng sau khi nhấn đặt hàng: có thể thử lại cùng idempotency key để lấy lại đơn đã tạo, tránh đặt trùng.

## Tiêu chí nghiệm thu

1. Checkout chỉ dùng `variantId` và số lượng từ giỏ; thay giá/tồn kho trong `localStorage` không làm thay đổi quote hoặc đơn.
2. Giá sau giảm, tổng tiền và snapshot item trong đơn khớp catalog tại thời điểm tạo; các số tiền là VND nguyên, không âm.
3. Hai yêu cầu đồng thời mua quá tồn kho không cùng thành công; đơn thất bại/hủy/hết hạn trả tồn kho đúng một lần.
4. Đơn cùng idempotency key không bị tạo trùng; key dùng lại với payload khác bị từ chối.
5. Tài khoản khác không xem/hủy được đơn; API không có phiên trả 401.
6. Sản phẩm không hỗ trợ khu vực giao hàng bị từ chối trước khi tạo đơn.
7. Callback/IPN hợp lệ cập nhật đơn một lần; callback giả, sai số tiền hoặc đến muộn không chuyển đơn sang `PAID` sai.
8. UI có trạng thái đang tải, giỏ trống, lỗi theo dòng, giá thay đổi, tạo đơn thành công và thanh toán thất bại.

## Giả định cần chốt trước khi triển khai checkout

- **Phạm vi địa chỉ GHN staging:** chỉ quote địa chỉ legacy do fee API công bố dùng district/ward ID cũ; địa chỉ mới cần mapping được GHN xác nhận trước khi bật.
- **Phí vận chuyển:** lấy phí từ GHN staging; shop là bên trả phí GHN, phí báo giá được cộng vào khoản thanh toán VNPAY.
- **Dữ liệu đóng gói:** profile seed là số liệu ước lượng để thử staging; production chưa được cấu hình và không dùng các số liệu này.
- **Hủy đơn:** người mua chỉ tự hủy trước khi thanh toán; chính sách hoàn tiền, đổi trả và hủy sau thanh toán để giai đoạn sau.
- **Hồ sơ người nhận quà:** liên kết với đơn là tùy chọn; xác nhận đã tặng sẽ có luồng riêng sau khi orders hoạt động.
- **Dữ liệu liên hệ:** dùng snapshot trên từng đơn, chưa xây sổ địa chỉ đã lưu.
