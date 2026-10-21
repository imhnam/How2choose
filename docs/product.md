# Howtochoose — Product specification v0.2

## Mục tiêu
Giúp người dùng chọn và mua quà phù hợp cho bạn bè, người yêu và gia đình dựa trên sở thích, dịp, ngân sách và lịch sử quà.

## Luồng MVP
Đăng ký/đăng nhập → tạo hoặc chọn người nhận → chọn dịp và ngân sách → AI tư vấn từ catalog → giỏ hàng → thanh toán sandbox → xác nhận đã tặng.

## Tài khoản
- Đăng ký và đăng nhập bằng email hoặc số điện thoại cùng mật khẩu.
- Có thể đăng nhập bằng Google sau khi cấu hình OAuth Client ID/Secret.
- Người dùng duy trì phiên bằng cookie HttpOnly, có thể đăng xuất.
- Chủ tài khoản có thể lưu ngày sinh tùy chọn.
- Tài khoản có thể lưu một địa chỉ giao hàng mặc định, gồm người nhận, số điện thoại và địa chỉ theo mã địa giới.
- Email/số điện thoại đăng ký bằng mật khẩu chưa được xác minh ở giai đoạn này. Chưa có đặt lại mật khẩu hoặc liên kết Google với tài khoản hiện có. Chưa mở đăng ký công khai trước khi bổ sung xác minh và khôi phục tài khoản.
- Google account được nhận diện bằng `sub` từ ID token đã xác thực. Không tự động liên kết theo email để tránh chiếm tài khoản local chưa xác minh.

## Phạm vi MVP
- Hồ sơ người nhận bằng form: tên, quan hệ, ngày sinh tùy chọn, sở thích, điều không thích, ghi chú, địa chỉ có cấu trúc tùy chọn và avatar. Cho phép trùng tên.
- Catalog mẫu bằng dữ liệu seed, gồm danh mục nhiều cấp, sản phẩm thuộc nhiều danh mục và biến thể theo màu/kích thước/chất liệu. Mỗi biến thể có thể có media riêng.
- AI gợi ý tối đa 3 gói quà thay thế; mỗi gói gồm một hoặc nhiều món còn hàng, tổng giá theo số lượng không vượt ngân sách. Hội thoại được lưu theo tài khoản/người nhận; API kiểm tra quyền sở hữu và xác thực ID, giá, tồn kho từ catalog sau khi Gemini trả kết quả.
- Lịch sử quà theo người nhận; mặc định tránh sản phẩm đã xác nhận tặng.
- Tạo đơn, báo phí GHN staging và tích hợp VNPAY sandbox.

## Quy tắc
- Hồ sơ người nhận thuộc tài khoản, không truy cập chéo.
- Trùng tên thì yêu cầu chọn hồ sơ cụ thể.
- Ngân sách thuộc lần tìm quà, không tự lưu thành sở thích lâu dài.
- Mua hàng và xác nhận đã tặng là hai sự kiện khác nhau.
- Giá, tồn kho và ID sản phẩm lấy từ backend, không tin dữ liệu AI hoặc trình duyệt.
- Khi không có sản phẩm phù hợp, thông báo rõ và đề nghị thay đổi tiêu chí.

## Catalog MVP
- Catalog giai đoạn đầu dùng dữ liệu giả lập trong database; mỗi biến thể có dữ liệu cân nặng/kích thước đóng gói để tính phí GHN. Trang admin tạo/sửa sản phẩm sẽ làm sau.
- Danh mục có thể lồng nhau. Một sản phẩm có thể thuộc nhiều danh mục.
- Sản phẩm lưu thương hiệu, nhà cung cấp dạng text, SKU ở biến thể, tồn kho, lượt mua và điểm đánh giá đã seed.
- Giảm giá hỗ trợ đồng thời phần trăm và số tiền cố định. Giá hiệu lực = giá gốc trừ phần trăm rồi trừ số tiền cố định, không thấp hơn 0.
- Trang ưu tiên trong giai đoạn này: danh mục, danh sách sản phẩm và chi tiết sản phẩm; chưa lọc theo hồ sơ người nhận trong catalog.
- Giỏ hàng giai đoạn đầu lưu ở trình duyệt để thử nghiệm nhanh; nút “Mua ngay” thêm biến thể đang chọn rồi mở giỏ hàng. Có thể chọn hồ sơ nhận quà ngay trong giỏ hàng; checkout nạp sẵn tên, số điện thoại và địa chỉ từ hồ sơ, cho phép chỉnh sửa và lưu lại vào hồ sơ. Thanh toán thật và đồng bộ giỏ hàng với tài khoản sẽ làm cùng orders/payment.
- Catalog có tìm kiếm ở header kèm gợi ý sản phẩm; bộ lọc “Khu vực” chỉ chọn tỉnh/thành sau sáp nhập 01/07/2025, cùng khoảng giá sau giảm và điểm đánh giá seed. Danh sách tỉnh/thành đến từ Province Open API. Dữ liệu giao hàng mẫu chỉ gồm Hà Nội, TP. Hồ Chí Minh, Đà Nẵng hoặc toàn quốc; các tỉnh khác chỉ hiện sản phẩm toàn quốc.
- Checkout lấy báo giá GHN staging cho địa chỉ cũ (tỉnh → huyện → xã/phường), tạo đơn giữ hàng 15 phút và chuyển tới VNPAY sandbox. Shipment staging chỉ được tạo sau IPN xác thực. Địa chỉ mới chưa được quote do GHN fee API cần district/ward ID cũ.

## Giai đoạn sau
Tạo/cập nhật hồ sơ từ chat với xác nhận trước khi lưu; ghi nhận quà mua bên ngoài; nhắc ngày; quy tắc tặng lại đồ tiêu hao; GHN production và hỗ trợ quote địa giới mới; xác minh email/SMS, khôi phục mật khẩu và liên kết nhiều cách đăng nhập.

## Giả định còn mở
- Một cửa hàng, VND, giao diện tiếng Việt.
- Phí GHN staging được cộng vào tổng VNPAY sandbox; shop là bên trả cước cho GHN.
- Chỉ giao dịch và vận chuyển thử nghiệm, không dùng VNPAY/GHN production.
- Nhà cung cấp/model AI chưa chọn.
- Gợi ý AI hiện dùng Gemini qua cấu hình server `GEMINI_API_KEY` và `GEMINI_MODEL`; cần cấu hình quota/rate limit dùng chung trước khi mở endpoint rộng rãi.
- Cách xóa hồ sơ khi đã có lịch sử quà chưa chốt. Bản hiện tại chưa có thao tác xóa.

## Hoàn thành MVP khi
Người dùng chạy được luồng chính; dữ liệu theo tài khoản; gợi ý tuân thủ catalog/ngân sách/lịch sử; callback thanh toán lặp không làm cập nhật trùng; có test, demo và hướng dẫn chạy.
