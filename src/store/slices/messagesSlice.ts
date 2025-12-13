import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import {
  Message,
  Conversation,
  MessagesState,
  AvailableUser,
  ApiResponse,
} from "../../types/messageTypes";

// API Base URL
const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Async thunks for API calls
export const fetchConversations = createAsyncThunk(
  "messages/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/api/messages/conversations`, {
        headers: getAuthHeaders(),
      });
      const data: ApiResponse<Conversation[]> = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }

      return data.data || [];
    } catch {
      return rejectWithValue("Failed to fetch conversations");
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/messages/conversation/${conversationId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const data: ApiResponse<Message[]> = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }

      return { conversationId, messages: data.data || [] };
    } catch {
      return rejectWithValue("Failed to fetch messages");
    }
  }
);

export const sendMessageAsync = createAsyncThunk(
  "messages/sendMessage",
  async (
    messageData: {
      receiverId: string;
      content: string;
      messageType?: "text" | "file" | "image";
      fileName?: string;
      fileUrl?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE}/api/messages/send`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(messageData),
      });
      const data: ApiResponse<Message> = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }

      return data.data;
    } catch {
      return rejectWithValue("Failed to send message");
    }
  }
);

export const markMessagesAsRead = createAsyncThunk(
  "messages/markAsRead",
  async (
    markData: {
      conversationId?: string;
      messageIds?: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE}/api/messages/mark-read`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(markData),
      });
      const data: ApiResponse = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }

      return markData;
    } catch {
      return rejectWithValue("Failed to mark messages as read");
    }
  }
);

export const fetchAvailableUsers = createAsyncThunk(
  "messages/fetchAvailableUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/api/messages/users`, {
        headers: getAuthHeaders(),
      });
      const data: ApiResponse<AvailableUser[]> = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }

      return data.data || [];
    } catch {
      return rejectWithValue("Failed to fetch available users");
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "messages/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/api/messages/unread-count`, {
        headers: getAuthHeaders(),
      });
      const data: ApiResponse<{ unreadCount: number }> = await response.json();

      if (!data.success) {
        return rejectWithValue(data.message);
      }

      return data.data?.unreadCount || 0;
    } catch {
      return rejectWithValue("Failed to fetch unread count");
    }
  }
);

const initialState: MessagesState = {
  messages: [],
  conversations: [],
  activeConversation: null,
  loading: false,
  error: null,
  unreadCount: 0,
  onlineUsers: [],
  typingUsers: {},
  availableUsers: [],
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversation = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;

      // Replace temporary message if this is a real message with similar content and timestamp
      if (!message.id.startsWith("temp_")) {
        // Find and remove temporary message with similar content
        const tempMessageIndex = state.messages.findIndex(
          (m) =>
            m.id.startsWith("temp_") &&
            m.conversationId === message.conversationId &&
            m.content === message.content &&
            Math.abs(
              new Date(m.timestamp).getTime() -
                new Date(message.timestamp).getTime()
            ) < 10000 // Within 10 seconds
        );
        if (tempMessageIndex !== -1) {
          state.messages.splice(tempMessageIndex, 1);
        }
      }

      // Add to messages array if not already exists
      const existingIndex = state.messages.findIndex(
        (m) => m.id === message.id
      );
      if (existingIndex === -1) {
        state.messages.push(message);
        // Sort messages by timestamp to maintain order
        state.messages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      } else {
        // Update existing message (in case of updates)
        state.messages[existingIndex] = message;
      }

      // Update conversations
      const conversationIndex = state.conversations.findIndex(
        (c) => c.conversationId === message.conversationId
      );

      if (conversationIndex >= 0) {
        state.conversations[conversationIndex].lastMessage = message;
        // Ensure messages array exists before pushing
        if (!state.conversations[conversationIndex].messages) {
          state.conversations[conversationIndex].messages = [];
        }

        // Replace temporary message in conversation if this is a real message
        if (!message.id.startsWith("temp_")) {
          const tempIndex = state.conversations[
            conversationIndex
          ].messages.findIndex(
            (m) =>
              m.id.startsWith("temp_") &&
              m.content === message.content &&
              Math.abs(
                new Date(m.timestamp).getTime() -
                  new Date(message.timestamp).getTime()
              ) < 10000
          );
          if (tempIndex !== -1) {
            state.conversations[conversationIndex].messages.splice(
              tempIndex,
              1
            );
          }
        }

        const existingMessageIndex = state.conversations[
          conversationIndex
        ].messages.findIndex((m) => m.id === message.id);
        if (existingMessageIndex === -1) {
          state.conversations[conversationIndex].messages.push(message);
          // Sort conversation messages by timestamp
          state.conversations[conversationIndex].messages.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        } else {
          state.conversations[conversationIndex].messages[
            existingMessageIndex
          ] = message;
        }
      }
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{
        messageId: string;
        read: boolean;
        readAt?: string;
      }>
    ) => {
      const { messageId, read, readAt } = action.payload;
      const message = state.messages.find((m) => m.id === messageId);
      if (message) {
        message.read = read;
        if (readAt) {
          message.readAt = readAt;
        }
      }
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
    addOnlineUser: (state, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(
        (id) => id !== action.payload
      );
    },
    setUserTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userName: string }>
    ) => {
      const { conversationId, userName } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId].includes(userName)) {
        state.typingUsers[conversationId].push(userName);
      }
    },
    removeUserTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userName: string }>
    ) => {
      const { conversationId, userName } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[
          conversationId
        ].filter((name) => name !== userName);
        if (state.typingUsers[conversationId].length === 0) {
          delete state.typingUsers[conversationId];
        }
      }
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = Math.max(0, state.unreadCount - action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload.map((conv: Conversation) => ({
          ...conv,
          messages: conv.messages || [],
        }));
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { conversationId, messages } = action.payload;

        // Update messages array
        state.messages = state.messages.filter(
          (m) => m.conversationId !== conversationId
        );
        state.messages.push(...messages);

        // Update conversation
        const conversationIndex = state.conversations.findIndex(
          (c) => c.conversationId === conversationId
        );
        if (conversationIndex >= 0) {
          state.conversations[conversationIndex].messages = messages;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Send message
      .addCase(sendMessageAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessageAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          // Add message will be handled by the addMessage reducer when socket confirms
        }
      })
      .addCase(sendMessageAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Mark as read
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        const { conversationId, messageIds } = action.payload;

        if (conversationId) {
          // Mark all messages in conversation as read
          state.messages.forEach((message) => {
            if (message.conversationId === conversationId && !message.read) {
              message.read = true;
              message.readAt = new Date().toISOString();
            }
          });
        } else if (messageIds) {
          // Mark specific messages as read
          state.messages.forEach((message) => {
            if (messageIds.includes(message.id) && !message.read) {
              message.read = true;
              message.readAt = new Date().toISOString();
            }
          });
        }
      })

      // Fetch available users
      .addCase(fetchAvailableUsers.fulfilled, (state, action) => {
        state.availableUsers = action.payload;
      })

      // Fetch unread count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const {
  setActiveConversation,
  addMessage,
  updateMessageStatus,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  setUserTyping,
  removeUserTyping,
  incrementUnreadCount,
  decrementUnreadCount,
  clearError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
