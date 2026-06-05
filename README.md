# Project Backend Init

Backend init, được xây dựng bằng NestJS và sử dụng MongoDB làm database.

## Environment

* Node.js: v22.12.0

## Tech Stack

* Framework: NestJS
* Database: MongoDB

## Installation (Development)

1. Clone repository:

   ```bash
   git clone <repo-url>
   cd <project-folder>
   ```

2. Cài đặt dependencies:

   ```bash
   npm install
   ```

3. Cấu hình môi trường:

   * Tạo file `.env` từ file `.env.example`
   * Cập nhật các biến môi trường cần thiết

4. Chạy project:

   ```bash
   npm run dev
   ```

## Notes

* Đảm bảo MongoDB đang chạy trước khi khởi động server
* Kiểm tra lại các biến môi trường nếu gặp lỗi kết nối database
