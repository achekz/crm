import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Message from "../models/Message";
import { logError, logInfo } from "./logger";

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "client";
  };
}

// Store active connections
const activeUsers = new Map<string, string>(); // userId -> socketId

export const initializeSocket = (httpServer: HttpServer) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests without an origin (e.g., mobile apps, server-to-server)
        if (!origin) return callback(null, true);

        // Always allow localhost in development
        if (
          origin.startsWith("http://localhost") ||
          origin.startsWith("http://127.0.0.1")
        ) {
          return callback(null, true);
        }

        // In production, allow FRONTEND_URL and known domains
        const allowedOrigins = [
          process.env.FRONTEND_URL,
          "https://cmtaudit.cloud",
          "https://www.cmtaudit.cloud",
          "https://cmtaudit.tn",
          "https://www.cmtaudit.tn",
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(token, jwtSecret) as {
        id: string;
      };
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Invalid token"));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (err) {
      logError("Socket authentication failed", err);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    logInfo("Socket client connected", {
      userId: socket.user.id,
      userName: socket.user.name,
      role: socket.user.role,
      socketId: socket.id,
    });

    // Store user connection
    activeUsers.set(socket.user.id, socket.id);

    // Join user to their personal room
    socket.join(socket.user.id);

    // Broadcast user online status
    socket.broadcast.emit("user:online", {
      userId: socket.user.id,
      name: socket.user.name,
      role: socket.user.role,
    });

    // Handle joining conversation rooms
    socket.on("join:conversation", (conversationId: string) => {
      socket.join(conversationId);
      logInfo("Socket joined conversation", {
        userId: socket.user?.id,
        conversationId,
      });
    });

    // Handle leaving conversation rooms
    socket.on("leave:conversation", (conversationId: string) => {
      socket.leave(conversationId);
      logInfo("Socket left conversation", {
        userId: socket.user?.id,
        conversationId,
      });
    });

    // Handle sending messages
    socket.on(
      "message:send",
      async (data: {
        receiverId: string;
        content: string;
        messageType?: "text" | "file" | "image";
        fileName?: string;
        fileUrl?: string;
        tempId?: string;
      }) => {
        try {
          if (!socket.user) return;

          const {
            receiverId,
            content,
            messageType = "text",
            fileName,
            fileUrl,
          } = data;

          // Generate conversation ID first
          const conversationId = generateConversationId(
            socket.user.id,
            receiverId
          );

          // Create message in database with conversationId
          const message = await Message.create({
            senderId: socket.user.id,
            receiverId,
            content,
            messageType,
            fileName,
            fileUrl,
            conversationId,
          });

          // Populate sender and receiver info
          await message.populate([
            { path: "senderId", select: "name email avatar role" },
            { path: "receiverId", select: "name email avatar role" },
          ]);

          // Ensure receiver is in the conversation room BEFORE emitting
          const receiverSocketId = activeUsers.get(receiverId);
          if (receiverSocketId) {
            const receiverSocket = io.sockets.sockets.get(receiverSocketId);
            if (receiverSocket) {
              receiverSocket.join(conversationId);
              logInfo("Receiver auto-joined conversation", {
                receiverId,
                conversationId,
              });
            }
          }

          // Emit to conversation room (includes both sender and receiver if they're in the room)
          io.to(conversationId).emit("message:new", {
            ...message.toObject(),
            conversationId,
            tempId: data.tempId,
          });

          // Also emit directly to receiver's personal room to guarantee delivery
          // even if receiver hasn't explicitly joined the conversation room
          io.to(receiverId).emit("message:new", {
            ...message.toObject(),
            conversationId,
            tempId: data.tempId,
          });

          // Emit to receiver's personal room for notification badge
          io.to(receiverId).emit("notification:new-message", {
            senderId: socket.user.id,
            senderName: socket.user.name,
            content: content.substring(0, 100),
            conversationId,
          });

          // Send confirmation to sender only (not broadcast)
          socket.emit("message:sent", {
            tempId: data.tempId,
            message: {
              ...message.toObject(),
              conversationId,
            },
          });
        } catch (error) {
          logError("Socket message send failed", error, {
            senderId: socket.user?.id,
            receiverId: data.receiverId,
          });
          socket.emit("message:error", { error: "Failed to send message" });
        }
      }
    );

    // Handle marking messages as read
    socket.on(
      "message:read",
      async (data: { conversationId?: string; messageIds?: string[] }) => {
        try {
          if (!socket.user) return;

          const { conversationId, messageIds } = data;

          const updateQuery: {
            receiverId: string;
            read: boolean;
            conversationId?: string;
            _id?: { $in: string[] };
          } = {
            receiverId: socket.user.id,
            read: false,
          };

          if (conversationId) {
            updateQuery.conversationId = conversationId;
          } else if (messageIds && Array.isArray(messageIds)) {
            updateQuery._id = { $in: messageIds };
          }

          const result = await Message.updateMany(updateQuery, {
            read: true,
            readAt: new Date(),
          });

          // Notify sender(s) that messages were read
          if (conversationId) {
            socket.to(conversationId).emit("message:read-receipt", {
              conversationId,
              readByUserId: socket.user.id,
              readCount: result.modifiedCount,
            });
          }

          socket.emit("message:marked-read", {
            conversationId,
            messageIds,
            count: result.modifiedCount,
          });
        } catch (error) {
          logError("Socket message read update failed", error, {
            userId: socket.user?.id,
            conversationId: data.conversationId,
          });
          socket.emit("message:error", {
            error: "Failed to mark messages as read",
          });
        }
      }
    );

    // Handle typing indicators
    socket.on(
      "typing:start",
      (data: { conversationId: string; receiverId: string }) => {
        if (!socket.user) return;

        socket.to(data.conversationId).emit("typing:user-typing", {
          userId: socket.user.id,
          userName: socket.user.name,
          conversationId: data.conversationId,
        });
      }
    );

    socket.on(
      "typing:stop",
      (data: { conversationId: string; receiverId: string }) => {
        if (!socket.user) return;

        socket.to(data.conversationId).emit("typing:user-stopped", {
          userId: socket.user.id,
          conversationId: data.conversationId,
        });
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      if (!socket.user) return;

      logInfo("Socket client disconnected", {
        userId: socket.user.id,
        userName: socket.user.name,
        role: socket.user.role,
        socketId: socket.id,
      });

      // Remove from active users
      activeUsers.delete(socket.user.id);

      // Broadcast user offline status
      socket.broadcast.emit("user:offline", {
        userId: socket.user.id,
        name: socket.user.name,
        role: socket.user.role,
      });
    });

    // Get online users
    socket.on("users:get-online", () => {
      const onlineUsers = Array.from(activeUsers.keys());
      socket.emit("users:online-list", onlineUsers);
    });
  });

  return io;
};

// Utility function to generate conversation ID
const generateConversationId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
};

export { activeUsers };
