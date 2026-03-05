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

      // Register listeners
      const onNewMessageHandler = (message: Message) => {
        console.log("🔔 New message received:", message);
        console.log(
          "📍 Current active conversation:",
          activeConversationRef.current
        );
        console.log("🎯 Message conversation:", message.conversationId);

        // Only refresh conversations for conversation list updates
        setTimeout(() => {
          dispatch(fetchConversations());
        }, 100);

        // Show notification if not in active conversation
        if (message.conversationId !== activeConversationRef.current) {
          notification.info({
            message: `Nouveau message de ${message.senderId.name}`,
            description: message.content.substring(0, 100),
            placement: "topRight",
            duration: 4,
          });
          dispatch(incrementUnreadCount());
        }
      };

      const onNewMessageNotificationHandler = (notif: MessageNotification) => {
        console.log("Message notification:", notif);

        // Show system notification
        notification.info({
          message: `Nouveau message de ${notif.senderName}`,
          description: notif.content,
          placement: "topRight",
          duration: 4,
        });

        dispatch(incrementUnreadCount());
        dispatch(fetchConversations());
      };

      const onMessageSentHandler = (data: {
        tempId?: string;
        message: Message;
      }) => {
        console.log("✅ Message sent confirmation:", data);
        console.log(
          "🔄 Not adding to Redux - let components handle their own state"
        );
        // Don't add to Redux - let components handle real-time updates
      };

      const onMessageErrorHandler = (error: { error: string }) => {
        console.error("Message error:", error);
        notification.error({
          message: "Erreur",
          description: error.error,
          placement: "topRight",
        });
      };

      const onUserOnlineHandler = (user: any) => {
        console.log("User came online:", user);
        dispatch(addOnlineUser(user.userId));
      };

      const onUserOfflineHandler = (user: any) => {
        console.log("User went offline:", user);
        dispatch(removeOnlineUser(user.userId));
      };

      const onOnlineUsersListHandler = (users: any) => {
        console.log("Online users list:", users);
        dispatch(setOnlineUsers(users));
      };

      const onInvoiceNotificationHandler = (invoiceNotification: any) => {
        console.log("📥 Invoice notification received:", invoiceNotification);
        dispatch(addInvoiceNotification(invoiceNotification));
        notification.info({
          message: invoiceNotification.title,
          description: invoiceNotification.message,
          placement: "topRight",
          duration: 6,
        });
      };

      // Attach listeners
      socketService.onNewMessage(onNewMessageHandler);
      socketService.onNewMessageNotification(onNewMessageNotificationHandler);
      socketService.onMessageSent(onMessageSentHandler);
      socketService.onMessageError(onMessageErrorHandler);
      socketService.onUserOnline(onUserOnlineHandler);
      socketService.onUserOffline(onUserOfflineHandler);
      socketService.onOnlineUsersList(onOnlineUsersListHandler);
      socketService.onInvoiceNotification(onInvoiceNotificationHandler);

      // Get initial online users list
      socketService.getOnlineUsers();

      // Fetch initial conversations
      dispatch(fetchConversations());

      return () => {
        console.log("Cleaning up socket listeners...");
        socketService.off("message:new", onNewMessageHandler);
        socketService.off("notification:new-message", onNewMessageNotificationHandler);
        socketService.off("message:sent", onMessageSentHandler);
        socketService.off("message:error", onMessageErrorHandler);
        socketService.off("user:online", onUserOnlineHandler);
        socketService.off("user:offline", onUserOfflineHandler);
        socketService.off("users:online-list", onOnlineUsersListHandler);
        socketService.off("notification:invoice", onInvoiceNotificationHandler);

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
