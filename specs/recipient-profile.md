# Recipient profile specification

## Phụ thuộc
Cần phiên đăng nhập hợp lệ. Owner lấy từ phiên đã xác minh, không lấy từ body hoặc query của client.

## Dữ liệu
id, ownerId, displayName, relationship, interests[], dislikes[], notes, createdAt, updatedAt.
Tên hiển thị sau trim bắt buộc, tối đa 100 ký tự; quan hệ tối đa 100; ghi chú tối đa 1000. Mỗi danh sách tối đa 30 mục, mỗi mục tối đa 100 ký tự.

## Hành vi
Tạo bằng form, liệt kê hồ sơ của mình, xem và sửa theo ID. Tên trùng được phép. Tạo từ chat và xóa hồ sơ để giai đoạn sau vì chính sách lịch sử quà chưa chốt.

## Tiêu chí nghiệm thu
1. Tạo hồ sơ hợp lệ và thấy lại sau khi tải trang.
2. Không xác thực: API trả 401.
3. Tài khoản B không thể xem hoặc sửa hồ sơ của A bằng ID.
4. Tên trùng không ghi đè hồ sơ cũ.
5. Input sai hoặc có field ngoài schema bị từ chối.
6. Form hiển thị trạng thái tải, lỗi, rỗng và thành công.
7. Có kiểm thử API cho phân quyền và lỗi.
