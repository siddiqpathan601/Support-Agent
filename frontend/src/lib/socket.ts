import { io, Socket } from "socket.io-client";

const getWsUrl = () => {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (envUrl && envUrl.trim() !== "") {
      return envUrl;
    }
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return window.location.origin;
    }
  }
  return process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";
};

const WS_URL = getWsUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("support_token")
      : null;

    socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () =>
      console.log("[Socket] Connected:", socket?.id)
    );
    socket.on("disconnect", (reason) =>
      console.log("[Socket] Disconnected:", reason)
    );
    socket.on("connect_error", (err) =>
      console.error("[Socket] Error:", err.message)
    );
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function joinConversation(conversationId: string) {
  getSocket().emit("join_conversation", { conversation_id: conversationId });
}

export function leaveConversation(conversationId: string) {
  getSocket().emit("leave_conversation", { conversation_id: conversationId });
}

export function sendTyping(conversationId: string, isTyping: boolean) {
  getSocket().emit("typing", { conversation_id: conversationId, is_typing: isTyping });
}

export function takeoverConversation(conversationId: string) {
  getSocket().emit("takeover", { conversation_id: conversationId });
}

export function sendStaffMessage(conversationId: string, message: string) {
  getSocket().emit("staff_message", { conversation_id: conversationId, message });
}

export function joinSupportRoom() {
  getSocket().emit("join_support_room", {});
}
