import { useEffect, useRef, useState } from "react";
import {
  Hand,
  MessageSquare,
  MousePointer2,
  PenLine,
  Send,
  ShieldAlert,
  Timer,
} from "lucide-react";

export default function LiveClassroom({ socket, user, classroom }) {
  const classroomId = classroom?.id || "ops-room";
  const [message, setMessage] = useState("Requesting legal review of the town hall speech draft.");
  const [chat, setChat] = useState([]);
  const [hands, setHands] = useState([]);
  const [strokes, setStrokes] = useState([]);
  const [tool, setTool] = useState("pen");
  const boardRef = useRef(null);

  useEffect(() => {
    if (!socket) return undefined;
    socket.emit("classroom:join", { classroomId, userName: user.name });
    const addChat = (item) => setChat((current) => [item, ...current].slice(0, 12));
    const addHand = (item) => setHands((current) => [item, ...current].slice(0, 8));
    const addStroke = (item) => setStrokes((current) => [...current, item.stroke].slice(-80));
    socket.on("chat:message", addChat);
    socket.on("hand:raised", addHand);
    socket.on("whiteboard:update", addStroke);
    return () => {
      socket.off("chat:message", addChat);
      socket.off("hand:raised", addHand);
      socket.off("whiteboard:update", addStroke);
    };
  }, [socket, classroomId, user.name]);

  function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    socket?.emit("chat:message", { classroomId, userName: user.name, message });
    setMessage("");
  }

  function raiseHand() {
    socket?.emit("hand:raise", {
      classroomId,
      learnerName: user.name,
      reason: "Needs compliance review",
    });
  }

  function draw(event) {
    if (tool !== "pen") return;
    const rect = boardRef.current.getBoundingClientRect();
    const stroke = {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
      color: "#0f766e",
    };
    setStrokes((current) => [...current, stroke].slice(-80));
    socket?.emit("whiteboard:update", { classroomId, stroke });
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-emerald-700">Campaign room</p>
            <h2 className="text-2xl font-black">{classroom?.title || "Campaign command"}</h2>
          </div>
          <div
            className="inline-flex w-fit overflow-hidden rounded-md border border-slate-200"
            role="group"
            aria-label="Whiteboard tools"
          >
            <button
              className={`flex min-h-10 items-center gap-2 px-3 font-bold ${tool === "pen" ? "bg-teal-700 text-white" : "bg-white"}`}
              type="button"
              onClick={() => setTool("pen")}
            >
              <PenLine size={16} aria-hidden="true" /> Pen
            </button>
            <button
              className={`flex min-h-10 items-center gap-2 px-3 font-bold ${tool === "pointer" ? "bg-teal-700 text-white" : "bg-white"}`}
              type="button"
              onClick={() => setTool("pointer")}
            >
              <MousePointer2 size={16} aria-hidden="true" /> Pointer
            </button>
          </div>
        </div>

        <div
          className="relative h-[440px] overflow-hidden rounded-md border border-slate-300 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px]"
          ref={boardRef}
          role="application"
          aria-label="Interactive shared whiteboard"
          onPointerDown={draw}
          onPointerMove={(event) => {
            if (event.buttons === 1) draw(event);
          }}
        >
          {strokes.map((stroke, index) => (
            <span
              className="absolute size-3 rounded-full bg-teal-700"
              key={`${stroke.x}-${stroke.y}-${index}`}
              style={{ left: stroke.x, top: stroke.y, background: stroke.color }}
            />
          ))}
        </div>
      </article>

      <aside className="grid gap-5">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Live chat</h2>
            <MessageSquare className="text-blue-700" aria-hidden="true" />
          </div>
          <form className="mb-4 flex gap-2" onSubmit={sendMessage}>
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label="Chat message"
            />
            <button
              className="grid size-11 place-items-center rounded-md bg-blue-700 text-white"
              type="submit"
              aria-label="Send chat"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          <div className="grid max-h-72 gap-2 overflow-auto" aria-live="polite">
            {(chat.length
              ? chat
              : [{ userName: "System", message: "Join the room and send the first message." }]
            ).map((item, index) => (
              <div className="rounded-md bg-slate-50 p-3" key={item.id || index}>
                <strong>{item.userName}</strong>
                <p className="text-slate-600">{item.message}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Hand queue</h2>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-amber-500 px-3 font-black text-slate-950"
              type="button"
              onClick={raiseHand}
            >
              <Hand size={18} aria-hidden="true" /> Raise hand
            </button>
          </div>
          <div className="grid gap-2" aria-live="polite">
            {(hands.length
              ? hands
              : [{ learnerName: "No reviews requested", reason: "The queue is clear." }]
            ).map((item, index) => (
              <div className="rounded-md border border-slate-200 p-3" key={item.id || index}>
                <strong>{item.learnerName}</strong>
                <p className="text-sm font-semibold text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">AI triage</h2>
            <ShieldAlert className="text-amber-600" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            <div className="rounded-md bg-amber-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-amber-900">
                <Timer size={15} aria-hidden="true" />
                Response SLA
              </div>
              <p className="text-sm font-bold text-amber-950">
                High-risk content, finance, and outreach recommendations route to an accountable
                approver before action.
              </p>
            </div>
            <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              Campaign staff see recommendations. Managers see source context. Admins see audited
              platform metrics.
            </p>
          </div>
        </article>
      </aside>
    </section>
  );
}
