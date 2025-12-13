import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  messageType: "text" | "file" | "image";
  fileName?: string;
  fileUrl?: string;
  conversationId: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    messageType: {
      type: String,
      enum: ["text", "file", "image"],
      default: "text",
    },
    fileName: {
      type: String,
    },
    fileUrl: {
      type: String,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });

// Generate conversation ID from sender and receiver IDs
messageSchema.statics.generateConversationId = function (
  userId1: string,
  userId2: string
): string {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Pre-save middleware to generate conversationId
messageSchema.pre("save", function (next) {
  if (!this.conversationId) {
    const ids = [this.senderId.toString(), this.receiverId.toString()].sort();
    this.conversationId = `${ids[0]}_${ids[1]}`;
  }
  next();
});

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
