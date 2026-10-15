# Authentication specification

## Cách đăng nhập
- Email/mật khẩu hoặc số điện thoại/mật khẩu; số nội địa Việt Nam 10 chữ số bắt đầu bằng 0 được chuẩn hóa thành +84. Số quốc tế dùng E.164.
- Google OAuth 2.0 authorization code flow. Backend đổi code và xác thực ID token; dùng Google `sub` làm định danh.
- Google chỉ xuất hiện trên UI khi có Client ID, Secret và callback URI.

## Phiên và bảo vệ
- Token phiên ngẫu nhiên; database chỉ giữ SHA-256 hash; cookie HttpOnly, SameSite=Lax; Secure khi chạy production; hạn 30 ngày.
- Đăng xuất thu hồi phiên phía server.
- Các API hồ sơ dùng user ID từ phiên, không nhận ownerId từ client.
- Yêu cầu thay đổi dữ liệu từ origin khác web được từ chối. Khi triển khai production, web và API cần cùng site HTTPS.
- Google callback xác thực state ngẫu nhiên, email_verified, chữ ký, issuer, audience và thời hạn ID token thông qua thư viện Google.
- Email Google trùng email tài khoản local chưa được tự động liên kết. Hiển thị lỗi và hướng dẫn dùng mật khẩu.

## Giới hạn giai đoạn này
- Chưa xác minh email/SMS của tài khoản local; số điện thoại chỉ là định danh đăng nhập, chưa chứng minh sở hữu.
- Chưa có quên/đặt lại mật khẩu, liên kết Google với tài khoản local, giới hạn lượt thử đăng nhập hoặc xác minh bổ sung.
- Cần bổ sung các mục này trước khi mở đăng ký công khai.

## Tiêu chí nghiệm thu
1. Đăng ký bằng email hoặc điện thoại, đăng nhập và đăng xuất được.
2. Sai mật khẩu bị từ chối; mật khẩu không lưu dạng rõ.
3. Tải lại trang vẫn còn phiên; đăng xuất làm phiên mất hiệu lực.
4. API hồ sơ không có phiên trả 401; tài khoản khác không đọc/sửa hồ sơ.
5. Google callback thiếu/sai state bị từ chối; ID token chỉ dùng sau khi được xác thực.
6. Khi chưa có Google credentials, UI không hiển thị nút Google và API báo chưa cấu hình.
7. Không tự động ghép tài khoản theo email trùng.
