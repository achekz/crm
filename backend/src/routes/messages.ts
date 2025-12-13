import { Router } from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  getConversationBetweenUsers,
  getAvailableUsers,
} from "../controllers/messageController";
import { protect } from "../middleware/auth";

const router = Router();

// All message routes require authentication
router.use(protect);

// Get all conversations for current user
router.get("/conversations", getConversations);

// Get available users to message
router.get("/users", getAvailableUsers);

// Get unread message count
router.get("/unread-count", getUnreadCount);

// Get messages for a specific conversation
router.get("/conversation/:conversationId", getMessages);

// Get conversation between current user and another specific user
router.get("/conversation/user/:otherUserId", getConversationBetweenUsers);

// Send a new message
router.post("/send", sendMessage);

// Mark messages as read
router.patch("/mark-read", markAsRead);

export default router;
