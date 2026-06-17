"""
Socket.IO Manager for real-time communication.

Features:
  - Live chat rooms per conversation
  - Human takeover signaling
  - Typing indicators
  - Online presence tracking
  - Agent notifications on escalation
"""

import socketio
from typing import Dict, Set

# Create async Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# Track active connections: {conversation_id: set of sid}
_conversation_rooms: Dict[str, Set[str]] = {}
# Track user sessions: {sid: user_id}
_session_users: Dict[str, str] = {}
# Track support staff online: {sid: user_id}
_online_staff: Dict[str, str] = {}


# ── Connection lifecycle ───────────────────────────────────────────────────────

@sio.event
async def connect(sid, environ, auth):
    """Handle new WebSocket connection."""
    token = (auth or {}).get("token", "")
    if token:
        try:
            from backend.app.services.auth import decode_token
            payload = decode_token(token)
            user_id = payload.get("sub", "anonymous")
            role = payload.get("role", "customer")
            _session_users[sid] = user_id

            if role in ("support", "admin"):
                _online_staff[sid] = user_id
                # Broadcast staff coming online
                await sio.emit("staff_online", {"user_id": user_id}, room="support_room")

            print(f"[SocketIO] Connected: sid={sid[:8]} user={user_id} role={role}")
        except Exception:
            print(f"[SocketIO] Invalid token from sid={sid[:8]}")
    else:
        print(f"[SocketIO] Anonymous connection: sid={sid[:8]}")


@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection."""
    user_id = _session_users.pop(sid, "unknown")
    _online_staff.pop(sid, None)

    # Remove from all rooms
    for convo_id, members in list(_conversation_rooms.items()):
        members.discard(sid)
        if not members:
            del _conversation_rooms[convo_id]

    await sio.emit("staff_offline", {"user_id": user_id}, room="support_room")
    print(f"[SocketIO] Disconnected: sid={sid[:8]} user={user_id}")


# ── Room management ───────────────────────────────────────────────────────────

@sio.event
async def join_conversation(sid, data):
    """Join a conversation room to receive real-time messages."""
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return {"error": "conversation_id required"}

    room_name = f"conv_{conversation_id}"
    await sio.enter_room(sid, room_name)

    if conversation_id not in _conversation_rooms:
        _conversation_rooms[conversation_id] = set()
    _conversation_rooms[conversation_id].add(sid)

    print(f"[SocketIO] {sid[:8]} joined room {room_name}")
    return {"status": "joined", "room": room_name}


@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room."""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        room_name = f"conv_{conversation_id}"
        await sio.leave_room(sid, room_name)
        if conversation_id in _conversation_rooms:
            _conversation_rooms[conversation_id].discard(sid)


@sio.event
async def join_support_room(sid, data):
    """Support staff join the global support room for notifications."""
    user_id = _session_users.get(sid)
    if user_id:
        await sio.enter_room(sid, "support_room")
        return {"status": "joined_support_room"}


# ── Messaging events ──────────────────────────────────────────────────────────

@sio.event
async def typing(sid, data):
    """Broadcast typing indicator to the conversation room."""
    conversation_id = data.get("conversation_id")
    is_typing = data.get("is_typing", True)
    user_id = _session_users.get(sid, "unknown")

    if conversation_id:
        await sio.emit(
            "typing_indicator",
            {"user_id": user_id, "is_typing": is_typing, "conversation_id": conversation_id},
            room=f"conv_{conversation_id}",
            skip_sid=sid,
        )


@sio.event
async def staff_message(sid, data):
    """Support staff sends a direct message into a conversation."""
    conversation_id = data.get("conversation_id")
    message = data.get("message", "")
    user_id = _session_users.get(sid, "unknown")

    if not conversation_id or not message:
        return {"error": "conversation_id and message required"}

    # Emit to all room participants
    await sio.emit(
        "new_message",
        {
            "conversation_id": conversation_id,
            "sender": "support_staff",
            "sender_id": user_id,
            "content": message,
        },
        room=f"conv_{conversation_id}",
    )
    return {"status": "sent"}


@sio.event
async def takeover(sid, data):
    """Support staff takes over a conversation from the AI."""
    conversation_id = data.get("conversation_id")
    user_id = _session_users.get(sid, "unknown")

    if not conversation_id:
        return {"error": "conversation_id required"}

    await sio.emit(
        "agent_takeover",
        {
            "conversation_id": conversation_id,
            "staff_id": user_id,
            "message": "A support specialist has joined the conversation.",
        },
        room=f"conv_{conversation_id}",
    )

    # Notify support room
    await sio.emit(
        "takeover_confirmed",
        {"conversation_id": conversation_id, "staff_id": user_id},
        room="support_room",
    )

    print(f"[SocketIO] Takeover: conv={conversation_id} by staff={user_id}")
    return {"status": "takeover_initiated"}


# ── Server-side emitters (called from API layer) ──────────────────────────────

async def emit_new_message(conversation_id: str, sender: str, content: str, metadata: dict = None):
    """Emit a new message event to a conversation room (from API)."""
    await sio.emit(
        "new_message",
        {
            "conversation_id": conversation_id,
            "sender": sender,
            "content": content,
            **(metadata or {}),
        },
        room=f"conv_{conversation_id}",
    )


async def emit_escalation_alert(conversation_id: str, ticket_id: str, priority: str):
    """Notify support staff of a new escalation."""
    await sio.emit(
        "escalation_alert",
        {
            "conversation_id": conversation_id,
            "ticket_id": ticket_id,
            "priority": priority,
        },
        room="support_room",
    )


def get_online_staff_count() -> int:
    return len(_online_staff)
