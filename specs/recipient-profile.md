# Recipient profile specification

## Phụ thuộc
Cần phiên đăng nhập hợp lệ. Owner lấy từ phiên đã xác minh, không lấy từ body hoặc query của client.

## Dữ liệu
id, ownerId, displayName, phone (tùy chọn), relationship, birthday (tùy chọn), interests[], dislikes[], notes, avatar, address, createdAt, updatedAt. Địa chỉ gồm phiên bản địa giới, tỉnh/thành, quận/huyện (nếu địa chỉ cũ), phường/xã và số nhà/tên đường; tên địa giới do API xác thực và lưu.
Tên hiển thị sau trim bắt buộc, tối đa 100 ký tự; quan hệ tối đa 100; ghi chú tối đa 1000. Mỗi danh sách tối đa 30 mục, mỗi mục tối đa 100 ký tự.

## Hành vi
Tạo bằng form, liệt kê hồ sơ của mình, xem và sửa theo ID. Tên trùng được phép. Số điện thoại lưu tùy chọn và được kiểm tra định dạng. Ngày sinh là tùy chọn. Địa chỉ có cấu trúc là tùy chọn, hỗ trợ cả địa giới hiện hành và địa giới cũ. Checkout có thể nạp sẵn tên, số điện thoại và địa chỉ từ hồ sơ; người dùng có thể lưu thông tin đã chỉnh sửa trở lại hồ sơ đã chọn. Avatar JPG, PNG hoặc WebP tối đa 5 MB được xác thực nội dung và chỉ chủ hồ sơ mới có thể tải lên/thay thế. Tạo từ chat và xóa hồ sơ để giai đoạn sau vì chính sách lịch sử quà chưa chốt.

## Tiêu chí nghiệm thu
1. Tạo hồ sơ hợp lệ và thấy lại sau khi tải trang.
2. Không xác thực: API trả 401.
3. Tài khoản B không thể xem hoặc sửa hồ sơ của A bằng ID.
4. Tên trùng không ghi đè hồ sơ cũ.
5. Input sai hoặc có field ngoài schema bị từ chối.
6. Form hiển thị trạng thái tải, lỗi, rỗng và thành công.
7. Có kiểm thử API cho phân quyền và lỗi.
8. Địa chỉ được lưu sau khi API xác thực mã tỉnh/thành, quận/huyện và phường/xã.
9. Avatar được hiển thị trong danh sách/chi tiết; tài khoản khác không thể thay ảnh.
