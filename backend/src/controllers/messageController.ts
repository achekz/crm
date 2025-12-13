import { Response, NextFunction } from "express";
import Message from "../models/Message";
import User from "../models/User";
import { AuthRequest } from "../types";
import { AppError, sendSuccessResponse } from "../utils/errorHandler";
import mongoose from "mongoose";

// Utility function to generate conversation ID
const generateConversationId = (userId1: string, userId2: string): string => {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Get all conversations for a user
export const getConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    const userId = req.user.id;

    // Get all unique conversation partners
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)],
                    },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.senderId",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.receiverId",
          foreignField: "_id",
          as: "receiver",
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: [
              {
                $eq: [
                  "$lastMessage.senderId",
                  new mongoose.Types.ObjectId(userId),
                ],
              },
              { $arrayElemAt: ["$receiver", 0] },
              { $arrayElemAt: ["$sender", 0] },
            ],
          },
        },
      },
      {
        $project: {
          conversationId: "$_id",
          lastMessage: 1,
          unreadCount: 1,
          otherUser: {
            id: "$otherUser._id",
            name: "$otherUser.name",
            email: "$otherUser.email",
            avatar: "$otherUser.avatar",
            role: "$otherUser.role",
          },
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    sendSuccessResponse(
      res,
      conversations,
      "Conversations retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Get messages for a specific conversation
export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Verify user is part of this conversation
    // For new conversations, check if the conversationId contains the user's ID
    const conversationCheck = await Message.findOne({
      conversationId,
      $or: [{ senderId: req.user.id }, { receiverId: req.user.id }],
    });

    // If no existing messages, validate that user is part of the conversation by checking conversation ID format
    if (!conversationCheck) {
      const conversationParts = conversationId.split("_");
      if (
        conversationParts.length !== 2 ||
        !conversationParts.includes(req.user.id)
      ) {
        return next(
          new AppError("Conversation not found or access denied", 404)
        );
      }
      // For new conversations, return empty messages array
      return sendSuccessResponse(res, [], "Messages retrieved successfully");
    }

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email avatar role")
      .populate("receiverId", "name email avatar role")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    // Mark messages as read if current user is the receiver
    await Message.updateMany(
      {
        conversationId,
        receiverId: req.user.id,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    sendSuccessResponse(
      res,
      messages.reverse(),
      "Messages retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Send a new message
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    const {
      receiverId,
      content,
      messageType = "text",
      fileName,
      fileUrl,
    } = req.body;

    if (!receiverId || !content) {
      return next(new AppError("Receiver ID and content are required", 400));
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return next(new AppError("Receiver not found", 404));
    }

    // Generate conversation ID
    const conversationId = generateConversationId(req.user.id, receiverId);

    // Create message
    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      content,
      messageType,
      fileName,
      fileUrl,
      conversationId, // Add the conversationId
    });

    // Populate sender and receiver info
    await message.populate([
      { path: "senderId", select: "name email avatar role" },
      { path: "receiverId", select: "name email avatar role" },
    ]);

    sendSuccessResponse(res, message, "Message sent successfully", 201);
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    const { conversationId, messageIds } = req.body;

    const updateQuery: {
      receiverId: string;
      read: boolean;
      conversationId?: string;
      _id?: { $in: string[] };
    } = {
      receiverId: req.user.id,
      read: false,
    };

    if (conversationId) {
      updateQuery.conversationId = conversationId;
    } else if (messageIds && Array.isArray(messageIds)) {
      updateQuery._id = { $in: messageIds };
    } else {
      return next(
        new AppError(
          "Either conversationId or messageIds must be provided",
          400
        )
      );
    }

    const result = await Message.updateMany(updateQuery, {
      read: true,
      readAt: new Date(),
    });

    sendSuccessResponse(
      res,
      { modifiedCount: result.modifiedCount },
      "Messages marked as read"
    );
  } catch (error) {
    next(error);
  }
};

// Get unread message count
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    const unreadCount = await Message.countDocuments({
      receiverId: req.user.id,
      read: false,
    });

    sendSuccessResponse(
      res,
      { unreadCount },
      "Unread count retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

// Get conversation between two specific users
export const getConversationBetweenUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return next(new AppError("Invalid user ID", 400));
    }

    // Generate conversation ID
    const conversationId = generateConversationId(req.user.id, otherUserId);

    // Get messages for this conversation
    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email avatar role")
      .populate("receiverId", "name email avatar role")
      .sort({ createdAt: 1 });

    // Mark messages as read if current user is the receiver
    await Message.updateMany(
      {
        conversationId,
        receiverId: req.user.id,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    sendSuccessResponse(res, messages, "Conversation retrieved successfully");
  } catch (error) {
    next(error);
  }
};

// Get all users that can be messaged (for admin: all clients, for client: only admins)
export const getAvailableUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    let users;

    if (req.user.role === "admin") {
      // Admin can message all clients
      users = await User.find({ role: "client" }, "name email avatar role");
    } else {
      // Client can message all admins
      users = await User.find({ role: "admin" }, "name email avatar role");
    }

    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    }));

    sendSuccessResponse(
      res,
      formattedUsers,
      "Available users retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};
