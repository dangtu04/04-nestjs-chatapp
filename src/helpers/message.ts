import { Types } from 'mongoose';
import { ConversationDocument } from '@/modules/conversation/schemas/conversation.schema';
import { MessageDocument } from '@/modules/message/schemas/message.schema';

export const updateConversationAfterCreateMessage = (
  conversation: ConversationDocument,
  message: MessageDocument,
  senderId: Types.ObjectId,
) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      senderId,
      createdAt: message.createdAt,
    },
  });
  conversation.participants.forEach((p) => {
    const memberId = p.userId;
    const isSender = p.userId.toString() === senderId.toString();
    const prevCount = conversation.unreadCounts.get(memberId.toString()) || 0;
    conversation.unreadCounts.set(
      memberId.toString(),
      isSender ? 0 : prevCount + 1,
    );
  });
};
