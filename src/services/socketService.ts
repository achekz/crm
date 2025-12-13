import { io, Socket } from "socket.io-client";
import {
  Message,
  MessageNotification,
  TypingData,
  UserOnlineStatus,
  MessageReadReceipt,
  SendMessageData,
  MarkAsReadData,
} from "../types/messageTypes";
import { InvoiceNotification } from "../store/slices/notificationsSlice";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    this.socket = io(
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
      {
        auth: {
          token,
        },
        autoConnect: true,
      }
    );

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join a conversation room
  joinConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit("join:conversation", conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit("leave:conversation", conversationId);
    }
  }

  // Send a message
  sendMessage(data: SendMessageData): void {
    if (this.socket) {
      console.log("Sending message via socket:", data);
      this.socket.emit("message:send", data);
    } else {
      console.error("Socket not connected - cannot send message");
      throw new Error("Socket not connected");
    }
  }

  // Mark messages as read
  markAsRead(data: MarkAsReadData): void {
    if (this.socket) {
      this.socket.emit("message:read", data);
    }
  }

  // Typing indicators
  startTyping(conversationId: string, receiverId: string): void {
    if (this.socket) {
      this.socket.emit("typing:start", { conversationId, receiverId });
    }
  }

  stopTyping(conversationId: string, receiverId: string): void {
    if (this.socket) {
      this.socket.emit("typing:stop", { conversationId, receiverId });
    }
  }

  // Get online users
  getOnlineUsers(): void {
    if (this.socket) {
      this.socket.emit("users:get-online");
    }
  }

  // Event listeners
  onNewMessage(callback: (message: Message) => void): void {
    if (this.socket) {
      this.socket.on("message:new", callback);
    }
  }

  onMessageSent(
    callback: (data: { tempId?: string; message: Message }) => void
  ): void {
    if (this.socket) {
      this.socket.on("message:sent", callback);
    }
  }

  onMessageError(callback: (error: { error: string }) => void): void {
    if (this.socket) {
      this.socket.on("message:error", callback);
    }
  }

  onNewMessageNotification(
    callback: (notification: MessageNotification) => void
  ): void {
    if (this.socket) {
      this.socket.on("notification:new-message", callback);
    }
  }

  onMessageReadReceipt(callback: (data: MessageReadReceipt) => void): void {
    if (this.socket) {
      this.socket.on("message:read-receipt", callback);
    }
  }

  onMessageMarkedRead(
    callback: (data: {
      conversationId?: string;
      messageIds?: string[];
      count: number;
    }) => void
  ): void {
    if (this.socket) {
      this.socket.on("message:marked-read", callback);
    }
  }

  onUserTyping(callback: (data: TypingData) => void): void {
    if (this.socket) {
      this.socket.on("typing:user-typing", callback);
    }
  }

  onUserStoppedTyping(callback: (data: TypingData) => void): void {
    if (this.socket) {
      this.socket.on("typing:user-stopped", callback);
    }
  }

  onUserOnline(callback: (user: UserOnlineStatus) => void): void {
    if (this.socket) {
      this.socket.on("user:online", callback);
    }
  }

  onUserOffline(callback: (user: UserOnlineStatus) => void): void {
    if (this.socket) {
      this.socket.on("user:offline", callback);
    }
  }

  onOnlineUsersList(callback: (users: string[]) => void): void {
    if (this.socket) {
      this.socket.on("users:online-list", callback);
    }
  }

  // Event listeners for invoice notifications
  onInvoiceNotification(callback: (notification: InvoiceNotification) => void): void {
    if (this.socket) {
      this.socket.on("notification:invoice", callback);
    }
  }

  // Remove event listeners
  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced use cases)
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;
