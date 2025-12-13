// Message Types - Updated to match backend response format
export interface MessageUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "client";
}

export interface Message {
  id: string;
  senderId: MessageUser;
  receiverId: MessageUser;
  content: string;
  messageType: "text" | "file" | "image";
  fileName?: string;
  fileUrl?: string;
  conversationId: string;
  read: boolean;
  readAt?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  tempId?: string;
}

// Legacy message format for backward compatibility
export interface LegacyMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: string;
}

export interface Conversation {
  conversationId: string;
  otherUser: MessageUser;
  lastMessage?: Message;
  unreadCount: number;
  messages: Message[];
}

export interface MessageNotification {
  senderId: string;
  senderName: string;
  content: string;
  conversationId: string;
}

export interface TypingData {
  userId: string;
  userName: string;
  conversationId: string;
}

export interface UserOnlineStatus {
  userId: string;
  name: string;
  role: "admin" | "client";
}

export interface MessageReadReceipt {
  conversationId: string;
  readByUserId: string;
  readCount: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface SendMessageData {
  receiverId: string;
  content: string;
  messageType?: "text" | "file" | "image";
  fileName?: string;
  fileUrl?: string;
  tempId?: string;
}

export interface MarkAsReadData {
  conversationId?: string;
  messageIds?: string[];
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "client";
}

// Redux State Types
export interface MessagesState {
  messages: Message[];
  conversations: Conversation[];
  activeConversation: string | null;
  loading: boolean;
  error: string | null;
  unreadCount: number;
  onlineUsers: string[];
  typingUsers: Record<string, string[]>; // conversationId -> array of user names
  availableUsers: AvailableUser[];
}

// Socket Event Types
export interface SocketEvents {
  "message:new": (message: Message) => void;
  "message:sent": (data: { tempId?: string; message: Message }) => void;
  "message:error": (error: { error: string }) => void;
  "notification:new-message": (notification: MessageNotification) => void;
  "message:read-receipt": (data: MessageReadReceipt) => void;
  "message:marked-read": (data: {
    conversationId?: string;
    messageIds?: string[];
    count: number;
  }) => void;
  "typing:user-typing": (data: TypingData) => void;
  "typing:user-stopped": (data: TypingData) => void;
  "user:online": (user: UserOnlineStatus) => void;
  "user:offline": (user: UserOnlineStatus) => void;
  "users:online-list": (users: string[]) => void;
}

// Helper function to convert legacy message format to new format
export const convertLegacyMessage = (
  legacyMessage: LegacyMessage,
  senderInfo: MessageUser,
  receiverInfo: MessageUser
): Message => {
  return {
    id: legacyMessage.id,
    senderId: senderInfo,
    receiverId: receiverInfo,
    content: legacyMessage.content,
    messageType: "text",
    conversationId: generateConversationId(senderInfo.id, receiverInfo.id),
    read: legacyMessage.read,
    timestamp: legacyMessage.timestamp,
  };
};

// Helper function to generate conversation ID
export const generateConversationId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
};
