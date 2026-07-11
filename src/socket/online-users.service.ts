import { Injectable } from '@nestjs/common';

@Injectable()
export class OnlineUsersService {
  /**
   * Map<
   *   userId,
   *   Set<socketId>
   * >
   * user1
   *   ├── socketA
   *   └── socketB
   *
   * user2
   *   └── socketC
   */
  private readonly onlineUsers = new Map<string, Set<string>>();

  /**
   * thêm một socket cho user
   *
   * một user có thể có nhiều socket
   */
  addUserSocket(userId: string, socketId: string): void {
    let sockets = this.onlineUsers.get(userId);

    if (!sockets) {
      sockets = new Set<string>();

      // chỉ tạo Set đúng một lần
      this.onlineUsers.set(userId, sockets);
    }

    // set sẽ tự bỏ qua nếu socketId đã tồn tại
    sockets.add(socketId);
  }

  /**
   * xóa socket khi client disconnect.
   */
  removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.onlineUsers.get(userId);

    // user không tồn tại trong Map
    if (!sockets) {
      return;
    }

    // xóa socket khỏi Set
    sockets.delete(socketId);

    /**
     * nếu Set đã rỗng, user không còn socket nào nữa, xóa user khỏi Map.
     */
    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
    }
  }

  /**
   * lấy tất cả socketId của một user.
   */
  getUserSocketIds(userId: string): string[] {
    const sockets = this.onlineUsers.get(userId);

    if (!sockets) {
      return [];
    }

    return [...sockets];
  }

  /**
   * kiểm tra user có online hay không.
   */
  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * lấy danh sách user đang online.
   */
  getOnlineUserIds(): string[] {
    return [...this.onlineUsers.keys()];
  }

  /**
   * tổng số user đang online.
   */
  getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }
}
