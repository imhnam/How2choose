# Howtochoose — Product specification v0.2

## Mục tiêu
Giúp người dùng chọn và mua quà phù hợp cho bạn bè, người yêu và gia đình dựa trên sở thích, dịp, ngân sách và lịch sử quà.

## Luồng MVP
Đăng ký/đăng nhập → tạo hoặc chọn người nhận → chọn dịp và ngân sách → AI tư vấn từ catalog → giỏ hàng → thanh toán sandbox → xác nhận đã tặng.

## Tài khoản
- Đăng ký và đăng nhập bằng email hoặc số điện thoại cùng mật khẩu.
- Có thể đăng nhập bằng Google sau khi cấu hình OAuth Client ID/Secret.
- Người dùng duy trì phiên bằng cookie HttpOnly, có thể đăng xuất.
- Email/số điện thoại đăng ký bằng mật khẩu chưa được xác minh ở giai đoạn này. Chưa có đặt lại mật khẩu hoặc liên kết Google với tài khoản hiện có. Chưa mở đăng ký công khai trước khi bổ sung xác minh và khôi phục tài khoản.
- Google account được nhận diện bằng `sub` từ ID token đã xác thực. Không tự động liên kết theo email để tránh chiếm tài khoản local chưa xác minh.

## Phạm vi MVP
- Hồ sơ người nhận bằng form: tên, quan hệ, sở thích, điều không thích, ghi chú. Cho phép trùng tên.
- Catalog mẫu bằng dữ liệu seed, gồm danh mục nhiều cấp, sản phẩm thuộc nhiều danh mục và biến thể theo màu/kích thước/chất liệu. Mỗi biến thể có thể có media riêng.
- AI gợi ý sản phẩm hợp lệ và giải thích lý do; hỏi thêm khi thiếu thông tin.
- Lịch sử quà theo người nhận; mặc định tránh sản phẩm đã xác nhận tặng.
- Tạo đơn và tích hợp VNPAY sandbox.

## Quy tắc
- Hồ sơ người nhận thuộc tài khoản, không truy cập chéo.
- Trùng tên thì yêu cầu chọn hồ sơ cụ thể.
- Ngân sách thuộc lần tìm quà, không tự lưu thành sở thích lâu dài.
- Mua hàng và xác nhận đã tặng là hai sự kiện khác nhau.
- Giá, tồn kho và ID sản phẩm lấy từ backend, không tin dữ liệu AI hoặc trình duyệt.
- Khi không có sản phẩm phù hợp, thông báo rõ và đề nghị thay đổi tiêu chí.

## Catalog MVP
- Catalog giai đoạn đầu dùng dữ liệu giả lập trong database; trang admin tạo/sửa sản phẩm sẽ làm sau.
- Danh mục có thể lồng nhau. Một sản phẩm có thể thuộc nhiều danh mục.
- Sản phẩm lưu thương hiệu, nhà cung cấp dạng text, SKU ở biến thể, tồn kho, lượt mua và điểm đánh giá đã seed.
- Giảm giá hỗ trợ đồng thời phần trăm và số tiền cố định. Giá hiệu lực = giá gốc trừ phần trăm rồi trừ số tiền cố định, không thấp hơn 0.
- Trang ưu tiên trong giai đoạn này: danh mục, danh sách sản phẩm và chi tiết sản phẩm; chưa lọc theo hồ sơ người nhận trong catalog.

## Giai đoạn sau
Tạo/cập nhật hồ sơ từ chat với xác nhận trước khi lưu; ghi nhận quà mua bên ngoài; nhắc ngày; quy tắc tặng lại đồ tiêu hao; giao hàng thật; xác minh email/SMS, khôi phục mật khẩu và liên kết nhiều cách đăng nhập.

## Giả định còn mở
- Một cửa hàng, VND, giao diện tiếng Việt.
- Ngân sách MVP tính tiền hàng, chưa tính phí vận chuyển.
- Chỉ giao dịch thử nghiệm, không thu tiền thật.
- Nhà cung cấp/model AI chưa chọn.
- Cách xóa hồ sơ khi đã có lịch sử quà chưa chốt. Bản hiện tại chưa có thao tác xóa.

## Hoàn thành MVP khi
Người dùng chạy được luồng chính; dữ liệu theo tài khoản; gợi ý tuân thủ catalog/ngân sách/lịch sử; callback thanh toán lặp không làm cập nhật trùng; có test, demo và hướng dẫn chạy.
