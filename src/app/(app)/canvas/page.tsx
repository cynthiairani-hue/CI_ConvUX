"use client";

import { InfiniteCanvas } from "@/components/canvas/infinite-canvas";
import { PageChatInput } from "@/components/ai-companion/page-chat-input";

/* The infinite canvas surface. AppShell suppresses the split-canvas takeover on
   this route — artifacts built in chat are captured into frames by the canvas
   itself instead of hijacking the layout. */
export default function CanvasPage() {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <InfiniteCanvas />
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30">
        <div className="pointer-events-auto">
          <PageChatInput placeholder="Ask to build — new artifacts land on this canvas..." />
        </div>
      </div>
    </div>
  );
}
