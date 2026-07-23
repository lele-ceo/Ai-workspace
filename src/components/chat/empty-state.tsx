"use client";

import { motion } from "framer-motion";
import { useApp } from "@/hooks/use-app";

// Centered dynamic headline for an empty thread. Copy adapts to the active
// model so switching providers visibly changes the surface even before a
// message is sent.
const HEADLINE: Record<string, string> = {
  base: "How can I help you today?",
  chatgpt: "What can I help with?",
  claude: "How can I help you today?",
  gemini: "Ask Gemini anything",
  perplexity: "What do you want to search?",
};

export function EmptyState() {
  const { activeModel } = useApp();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <motion.h2
        key={activeModel.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-[28px]"
      >
        {HEADLINE[activeModel.id] ?? HEADLINE.base}
      </motion.h2>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
        {activeModel.name} · {activeModel.provider}
      </p>
    </div>
  );
}
