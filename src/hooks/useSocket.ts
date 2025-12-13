import { useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import socketService from "../services/socketService";
import {
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  incrementUnreadCount,
  fetchConversations,
} from "../store/slices/messagesSlice";
import { addInvoiceNotification } from "../store/slices/notificationsSlice";
import { Message, MessageNotification } from "../types/messageTypes";
import { notification } from "antd";

export const useSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { activeConversation } = useSelector(
    (state: RootState) => state.messages
  );

  // Use ref to keep track of current active conversation for socket events
  const activeConversationRef = useRef<string | null>(null);

  // Update ref when active conversation changes
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Initialize socket connection
  useEffect(() => {
    if (token && user) {
      console.log("Initializing socket connection...");
      socketService.connect(token);

      // Set up event listeners
      socketService.onNewMessage((message: Message) => {
        console.log("🔔 New message received:", message);
        console.log(
          "📍 Current active conversation:",
          activeConversationRef.current
        );
        console.log("🎯 Message conversation:", message.conversationId);

        // Only refresh conversations for conversation list updates
        // Reduced delay since components handle their own updates now
        setTimeout(() => {
          dispatch(fetchConversations());
        }, 100);

        // Show notification if not in active conversation
        if (message.conversationId !== activeConversationRef.current) {
          console.log(
            "📬 Showing notification for message not in active conversation"
          );
          notification.info({
            message: `Nouveau message de ${message.senderId.name}`,
            description: message.content.substring(0, 100),
            placement: "topRight",
            duration: 4,
          });
          dispatch(incrementUnreadCount());
        } else {
          console.log(
            "✅ Message is for current active conversation - no notification needed"
          );
        }
      });

      socketService.onNewMessageNotification((notif: MessageNotification) => {
        console.log("Message notification:", notif);

        // Show system notification
        notification.info({
          message: `Nouveau message de ${notif.senderName}`,
          description: notif.content,
          placement: "topRight",
          duration: 4,
        });

        dispatch(incrementUnreadCount());
      });

      socketService.onMessageSent(
        (data: { tempId?: string; message: Message }) => {
          console.log("✅ Message sent confirmation:", data);
          console.log(
            "🔄 Not adding to Redux - let components handle their own state"
          );
          // Don't add to Redux - let components handle real-time updates
        }
      );

      socketService.onMessageError((error: { error: string }) => {
        console.error("Message error:", error);
        notification.error({
          message: "Erreur",
          description: error.error,
          placement: "topRight",
        });
      });

      socketService.onMessageReadReceipt((data) => {
        console.log("Message read receipt:", data);
        // Update message status in UI if needed
      });

      socketService.onMessageMarkedRead((data) => {
        console.log("Messages marked as read:", data);
        // Handle read confirmation
      });

      socketService.onUserOnline((user) => {
        console.log("User came online:", user);
        dispatch(addOnlineUser(user.userId));
      });

      socketService.onUserOffline((user) => {
        console.log("User went offline:", user);
        dispatch(removeOnlineUser(user.userId));
      });

      socketService.onOnlineUsersList((users) => {
        console.log("Online users list:", users);
        dispatch(setOnlineUsers(users));
      });

      // Listen for invoice notifications
      socketService.onInvoiceNotification((invoiceNotification) => {
        console.log("📥 Invoice notification received:", invoiceNotification);
        
        // Dispatch to Redux store
        dispatch(addInvoiceNotification(invoiceNotification));
        
        // Show notification UI
        notification.info({
          message: invoiceNotification.title,
          description: invoiceNotification.message,
          placement: "topRight",
          duration: 6,
        });
      });

      // Get initial online users list
      socketService.getOnlineUsers();

      // Fetch initial conversations
      dispatch(fetchConversations());

      return () => {
        console.log("Cleaning up socket connection...");
        socketService.disconnect();
      };
    }
  }, [token, user, dispatch]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (activeConversation) {
      console.log("Joining conversation:", activeConversation);
      socketService.joinConversation(activeConversation);

      return () => {
        console.log("Leaving conversation:", activeConversation);
        socketService.leaveConversation(activeConversation);
      };
    }
  }, [activeConversation]);

  // Socket utility functions
  const sendMessage = useCallback(
    (data: {
      receiverId: string;
      content: string;
      messageType?: "text" | "file" | "image";
      fileName?: string;
      fileUrl?: string;
      tempId?: string;
    }): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!socketService.isConnected()) {
          const error = new Error("Socket not connected");
          notification.error({
            message: "Erreur de connexion",
            description:
              "Impossible d'envoyer le message. Vérifiez votre connexion.",
            placement: "topRight",
          });
          reject(error);
          return;
        }

        try {
          // If tempId wasn't provided in the data, generate one
          const messageData = data.tempId ? data : { ...data, tempId: `temp_${Date.now()}` };
          socketService.sendMessage(messageData);
          resolve();
        } catch (error) {
          console.error("Failed to send message:", error);
          reject(error);
        }
      });
    },
    []
  );

  const markAsRead = useCallback(
    (data: { conversationId?: string; messageIds?: string[] }) => {
      socketService.markAsRead(data);
    },
    []
  );

  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
  }, []);

  const isConnected = useCallback(() => {
    return socketService.isConnected();
  }, []);

  return {
    sendMessage,
    markAsRead,
    joinConversation,
    isConnected,
  };
};
