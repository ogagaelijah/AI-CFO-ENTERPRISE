// frontend/src/components/Landing/ChatWidget.jsx
// v1.0.1 — Fix: use VITE_API_URL with the same `/api` convention as Landing.jsx.
//          Previously fell back to '' which POSTed to the frontend origin
//          (localhost:5173) and 404'd. Now falls back to localhost:5000/api.

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const SUPPORT_EMAIL = 'support@aicfotechnologies.com';
const MAX_MESSAGES_PER_MIN = 5;

// Match Landing.jsx: VITE_API_URL is expected to include `/api` at the end.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi 👋 I can answer questions about AI CFO Enterprise — features, pricing, industries, and setup. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [timestamps, setTimestamps] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const withinRateLimit = () => {
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < 60_000);
    return recent.length < MAX_MESSAGES_PER_MIN;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!withinRateLimit()) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `You're sending messages too fast. Please wait a moment, or email ${SUPPORT_EMAIL}.`,
        },
      ]);
      return;
    }

    setTimestamps((t) => [...t, Date.now()]);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Request failed');
      }
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Sorry — something went wrong. Please email ${SUPPORT_EMAIL}.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 shadow-lg flex items-center justify-center hover:bg-primary-700 dark:hover:bg-gold-600 transition"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-8rem)] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col transition-colors duration-300">
          {/* Header */}
          <div className="px-4 py-3 bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">Ask AI CFO</div>
              <div className="text-xs opacity-80">Powered by DeepSeek</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-lg leading-none">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900'
                      : 'bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400 rounded-lg px-3 py-2 text-xs">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-slate-700 p-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask about pricing, features, setup…"
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-gold-400"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="px-3 rounded-lg bg-primary-600 dark:bg-gold-500 text-white dark:text-slate-900 font-semibold text-sm disabled:opacity-50 hover:bg-primary-700 dark:hover:bg-gold-600 transition"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}