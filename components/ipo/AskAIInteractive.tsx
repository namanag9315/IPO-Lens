"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, MessageSquare, ArrowRight } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AskAIInteractiveProps {
  ipoData: {
    name: string;
    category?: string | null;
    latest_gmp?: number | null;
    price_band_high?: number | null;
    price_band_low?: number | null;
    issue_size_cr?: number | null;
    lot_size?: number | null;
    registrar_name?: string | null;
    financials_yearly?: any[];
    peer_comparisons?: any[];
    subscription_data?: any[];
    ai_analysis?: any;
    enriched_data?: any;
  };
}

export default function AskAIInteractive({ ipoData }: AskAIInteractiveProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi there! I am the **IPO Lens AI Assistant**. 

Ask me anything about the **${ipoData.name}** IPO! For example, you can ask me:
- *"Is the P/E ratio reasonable compared to peers?"*
- *"Summarize the company's financial growth"*
- *"What are the main risks associated with this issue?"*`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Analyze valuation vs peers",
    "Summarize financial health",
    "What are the main risk factors?",
    "Should I apply for listing gains?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Clean context to avoid sending redundant heavy nested payloads
      const context = {
        name: ipoData.name,
        category: ipoData.category,
        latest_gmp: ipoData.latest_gmp,
        price_band_low: ipoData.price_band_low,
        price_band_high: ipoData.price_band_high,
        issue_size_cr: ipoData.issue_size_cr,
        lot_size: ipoData.lot_size,
        registrar_name: ipoData.registrar_name,
        financials_yearly: ipoData.financials_yearly?.slice(0, 5),
        peer_comparisons: ipoData.peer_comparisons,
        latest_subscription: ipoData.subscription_data?.[0],
        ai_summary: ipoData.ai_analysis?.[0]?.summary
      };

      const res = await fetch("/api/chat-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userMessage: text,
          chatHistory: history,
          ipoContext: context
        })
      });

      if (!res.ok) {
        throw new Error("Failed to contact AI endpoint");
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request. Please try again shortly."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* 1. Header Hero button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_24px_rgba(99,102,241,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Sparkles size={14} className="animate-pulse" />
        Ask IPO Lens AI
      </button>

      {/* 2. Chat drawer / modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end font-sans bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md bg-[#fafbfc] h-full shadow-2xl flex flex-col relative animate-slide-in">
            {/* Header */}
            <div className="bg-[#0a192f] text-white p-5 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles size={18} className="text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-wide">IPO Lens AI</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online Assistant</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m) => {
                const isAI = m.role === "assistant";
                return (
                  <div key={m.id} className={`flex ${isAI ? "justify-start" : "justify-end"} items-start gap-2.5`}>
                    {isAI && (
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 text-[10px] font-black uppercase shadow-sm mt-0.5">
                        AI
                      </div>
                    )}
                    <div 
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed font-bold shadow-sm border ${
                        isAI 
                          ? "bg-white text-slate-700 border-slate-100/80" 
                          : "bg-blue-600 text-white border-blue-700"
                      }`}
                    >
                      <div className="whitespace-pre-line prose prose-sm max-w-none">
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 text-[10px] font-black uppercase shadow-sm mt-0.5 animate-pulse">
                    AI
                  </div>
                  <div className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm flex gap-1 items-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (Shown when suggestions box is relevant) */}
            {messages.length === 1 && (
              <div className="px-5 pb-2 pt-1 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Suggested Questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendMessage(q)}
                      className="text-[10px] font-bold text-slate-600 bg-white border border-slate-100 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/20 px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 group"
                    >
                      {q}
                      <ArrowRight size={10} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Ask about ${ipoData.name}...`}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:bg-white transition-all"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={isTyping || !inputValue.trim()}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-300 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
