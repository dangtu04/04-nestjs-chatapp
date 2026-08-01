# Chat App – Luồng gửi tin nhắn đầu tiên (tạo Conversation)

## Tổng quan

Khi user A nhắn tin cho user B lần đầu tiên (chưa có `conversationId`), hệ thống cần:

1. Tạo `Conversation` mới trên database.
2. Tạo `Message` đầu tiên.
3. Thông báo cho **cả hai phía** qua Socket.IO để UI cập nhật tức thì.

---

## Sơ đồ luồng

```
[User A – Browser]                  [NestJS Backend]               [User B – Browser]
       │                                   │                               │
       │  1. POST /messages/direct          │                               │
       │  { recipientId, content }          │                               │
       │──────────────────────────────────>│                               │
       │                                   │                               │
       │                                   │ 2. Tìm conversationId?        │
       │                                   │    → Không có                 │
       │                                   │    → Tạo Conversation mới     │
       │                                   │                               │
       │                                   │ 3. Tạo Message đầu tiên       │
       │                                   │                               │
       │                                   │ 4. updateConversation         │
       │                                   │    (lastMessage, unreadCounts)│
       │                                   │                               │
       │                                   │ 5. Populate participants      │
       │                                   │    (name, avatarUrl)          │
       │                                   │                               │
       │                                   │ 6. emit('new-conversation')   │
       │                                   │    → to(senderId)    ─────────────────────────────┐
       │                                   │    → to(recipientId) ─────────────────────────────┤
       │<──────────────────────────────────│                               │                   │
       │  7. HTTP 201 { message }          │                               │<──────────────────┘
       │                                   │                               │  7. nhận socket event
       │                                   │                               │     'new-conversation'
       │                                   │                               │
```

---

## Chi tiết từng bước

### Bước 1 – Frontend A gọi HTTP

**File:** `useChatStore.ts` → `sendDirectMessage()`

```ts
const { activeConversationId } = get(); // null nếu chưa có conversation

await chatService.sendDirectMessage(
  recipientId,
  content,
  imgUrl,
  activeConversationId || undefined, // undefined = chưa có conversationId
);
```

- `activeConversationId` = `null` → backend biết đây là tin nhắn đầu tiên.

---

### Bước 2 – Backend kiểm tra & tạo Conversation

**File:** `message.service.ts` → `sendDirectMessage()`

```ts
if (!conversationId) {
  conversation = await this.conversationModel.create({
    type: ConversationType.DIRECT,
    participants: [
      { userId: new Types.ObjectId(senderId), joinedAt: new Date() },
      { userId: new Types.ObjectId(recipientId), joinedAt: new Date() },
    ],
    lastMessageAt: new Date(),
    unreadCounts: new Map(),
  });
}
```

---

### Bước 3 – Tạo Message

```ts
const message = await this.messageModel.create({
  conversationId: conversation._id,
  senderId: new Types.ObjectId(senderId),
  content,
});
```

---

### Bước 4 – Cập nhật Conversation

```ts
// Kiểm tra trước khi update để biết đây có phải tin nhắn đầu không
const isFirstMessage = !conversation.lastMessage;

updateConversationAfterCreateMessage(conversation, message, senderId);
await conversation.save();
// → cập nhật lastMessage, lastMessageAt, unreadCounts
```

---

### Bước 5 – Populate participants (chỉ khi là tin nhắn đầu)

```ts
if (isFirstMessage) {
  await conversation.populate({
    path: 'participants.userId',
    select: 'name avatarUrl',
  });
  // → user B có đủ tên/avatar để hiển thị conversation mới
}
```

Nếu **không phải** tin nhắn đầu, dùng `emitNewMessage` thông thường (không cần populate).

---

### Bước 6 – Emit Socket: `new-conversation`

**File:** `socket-events.service.ts` → `emitNewConversation()`

```ts
const payload = {
  message,       // MessageDocument thô
  conversation: {
    _id, type, participants, lastMessage, lastMessageAt, unreadCounts
  },
};

this.server.to(recipientId).emit('new-conversation', payload); // → B
this.server.to(senderId).emit('new-conversation', payload);    // → A
```

**Lý do emit về cả A:**  
User A gửi qua HTTP nhưng store của A chưa có conversation mới. Emit về A để A tự cập nhật danh sách mà không cần reload.

**Room hoạt động thế nào:**  
Khi client kết nối socket, backend cho client `join` room bằng `userId`:
```ts
// chat.gateway.ts - handleConnection
client.join(user._id.toString());
```
→ `to(senderId)` và `to(recipientId)` đều tìm đúng socket client.

---

### Bước 7 – Frontend xử lý `new-conversation`

**File:** `useSocketStore.ts`

```ts
socket.on("new-conversation", ({ message, conversation }) => {
  // 1. Thêm message vào store
  if (message) {
    useChatStore.getState().addMessage(message);
  }

  // 2. Normalize conversation (đảm bảo lastMessage có sender shape đúng)
  const normalizedConversation = {
    ...conversation,
    lastMessage: conversation.lastMessage ? {
      ...conversation.lastMessage,
      sender: {
        _id: conversation.lastMessage.sender?._id ?? conversation.lastMessage.senderId ?? "",
        name: conversation.lastMessage.sender?.name ?? "",
        avatarUrl: conversation.lastMessage.sender?.avatarUrl ?? null,
      },
    } : null,
  };

  // 3. Thêm mới hoặc merge conversation vào store (idempotent)
  useChatStore.setState((state) => {
    const exists = state.conversations.some(
      (item) => item._id.toString() === conversation._id.toString(),
    );
    return {
      conversations: exists
        ? state.conversations.map((item) =>
            item._id.toString() === conversation._id.toString()
              ? { ...item, ...normalizedConversation }
              : item,
          )
        : [normalizedConversation, ...state.conversations],
    };
  });

  // 4. Tự động markAsSeen nếu đang mở conversation này
  if (message && useChatStore.getState().activeConversationId === message.conversationId) {
    useChatStore.getState().markAsSeen();
  }
});
```

**Logic idempotent:** Nếu conversation đã tồn tại → merge. Nếu chưa → thêm lên đầu danh sách.  
→ Cả A và B đều chạy cùng handler, không bị trùng lặp.

---

### Bước 7b – Fetch lại conversations khi socket connect

**File:** `useSocketStore.ts`

```ts
socket.on("connect", () => {
  useChatStore.getState().fetchConversations(); // đồng bộ lại danh sách mới nhất
});
```

---

## So sánh: Tin nhắn đầu vs Tin nhắn thường

| | Tin nhắn đầu tiên (`isFirstMessage = true`) | Tin nhắn thường (`isFirstMessage = false`) |
|---|---|---|
| Tạo Conversation | ✅ Có | ❌ Không |
| Populate participants | ✅ Có (name, avatarUrl) | ❌ Không |
| Socket event | `new-conversation` | `new-message` |
| Gửi về A | ✅ Có | ✅ Có (qua room conversationId) |
| Gửi về B | ✅ Có | ✅ Có (qua room conversationId) |

> **Lưu ý:** Sau khi `new-conversation` được xử lý, client sẽ **tự động join room** `conversationId` mới trong lần kết nối socket tiếp theo (do `fetchConversations` + `getUserConversationForSocketIo` trong `handleConnection`). Hoặc cũng có thể emit `join-conversation` thủ công từ client.

---

## Cảnh báo / Edge cases

- **`lastMessage.sender.name/avatarUrl` luôn rỗng trong `new-message`:**  
  Backend không populate sender ở `emitNewMessage`. Frontend tự fallback về `""` / `null`. Nếu UI cần hiển thị avatar ở preview tin nhắn cuối, cần xử lý riêng.

- **`activeConversationId` của A sau khi gửi:**  
  HTTP `sendDirectMessage` không tự set `activeConversationId`. Nếu muốn A tự động mở conversation vừa tạo, UI cần set `activeConversationId = conversation._id` từ response hoặc sau khi nhận socket event.
