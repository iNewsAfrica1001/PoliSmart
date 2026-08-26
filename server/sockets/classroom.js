import { store } from "../data/store.js";

function itemId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function registerClassroomSockets(io) {
  io.on("connection", (socket) => {
    socket.on("classroom:join", ({ classroomId = "class-8a", userName = "Learner" } = {}, ack) => {
      socket.join(`classroom:${classroomId}`);
      const presence = {
        id: itemId("presence"),
        classroomId,
        userName,
        status: "joined",
        at: new Date().toISOString(),
      };
      socket.to(`classroom:${classroomId}`).emit("classroom:presence", presence);
      ack?.({ ok: true, presence });
    });

    socket.on(
      "chat:message",
      ({ classroomId = "class-8a", userName = "Learner", message = "" } = {}, ack) => {
        const chat = {
          id: itemId("chat"),
          classroomId,
          userName,
          message: String(message).slice(0, 500),
          at: new Date().toISOString(),
        };
        store.chatMessages.unshift(chat);
        io.to(`classroom:${classroomId}`).emit("chat:message", chat);
        ack?.({ ok: true, chat });
      },
    );

    socket.on(
      "hand:raise",
      ({ classroomId = "class-8a", learnerName = "Learner", reason = "Needs help" } = {}, ack) => {
        const hand = {
          id: itemId("hand"),
          classroomId,
          learnerName,
          reason: String(reason).slice(0, 160),
          at: new Date().toISOString(),
          status: "waiting",
        };
        store.handQueue.push(hand);
        io.to(`classroom:${classroomId}`).emit("hand:raised", hand);
        ack?.({ ok: true, hand });
      },
    );

    socket.on("whiteboard:update", ({ classroomId = "class-8a", stroke } = {}, ack) => {
      const event = { id: itemId("stroke"), classroomId, stroke, at: new Date().toISOString() };
      store.whiteboardEvents.push(event);
      socket.to(`classroom:${classroomId}`).emit("whiteboard:update", event);
      ack?.({ ok: true, event });
    });
  });
}
