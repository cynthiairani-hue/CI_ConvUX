"use client";

import { InfiniteCanvas } from "@/components/canvas/infinite-canvas";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";

/* The infinite canvas surface. AppShell suppresses the split-canvas takeover on
   this route — artifacts built in chat are captured into frames by the canvas
   itself instead of hijacking the layout. */
export default function CanvasPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#F7F9FB]">
      <div className="relative min-h-0 flex-1">
        <InfiniteCanvas />
      </div>
      {/* Same chat-input mounting as every other page — no overlay, no resize drift */}
      <div className="shrink-0 pb-6 pt-2">
        <PageChatInput placeholder="Ask to build — new artifacts land on this canvas..." openIn="floating-left" />
      </div>
    </div>
  );
}
