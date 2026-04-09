import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { geminiModel } from '@/lib/gemini';
import type { ChatSession } from '@google/generative-ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const getWelcomeMessage = (board: string = 'CBSE', classLevel: number = 10): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: `Hi! I'm your ${board} Class ${classLevel} AI tutor. I teach Science and Maths using the Socratic method — I'll guide you with questions to help you think, rather than just giving answers.\n\nAsk me anything! For example:\n- "Explain Ohm's Law"\n- "How do I solve quadratic equations?"\n- "What is photosynthesis?"`,
  timestamp: new Date(),
});

// Simple markdown-like renderer for bold and italic
function renderMarkdownLike(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Match **bold** and *italic*
  const regex = /\*\*([^\*]+)\*\*|\*([^\*]+)\*/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add formatted text
    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={`${match.index}-bold`} className="font-bold text-white">
          {match[1]}
        </strong>
      );
    } else if (match[2]) {
      // *italic*
      parts.push(
        <em key={`${match.index}-italic`} className="italic">
          {match[2]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Extract Key Takeaway section if it exists
function extractKeyTakeaway(text: string): { main: string; takeaway: string } | null {
  const keyTakeawayMatch = text.match(/Key Takeaway:\s*(.+?)(?=\n|$)/i);
  if (keyTakeawayMatch) {
    const takeaway = keyTakeawayMatch[1].trim();
    const main = text.replace(keyTakeawayMatch[0], '').trim();
    return { main, takeaway };
  }
  return null;
}

// Extract current concept from last user message
function getCurrentConcept(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return 'Start a conversation to see concepts here';
}

// Calculate session mastery percentage
function getSessionMastery(messageCount: number): number {
  const percentage = Math.min((messageCount / 20) * 100, 100);
  return Math.round(percentage);
}

const quickTopics = [
  'Explain Ohm\'s Law',
  'Help with quadratic equations',
  'What is photosynthesis?',
  'Acids and bases',
  'Newton\'s Laws of Motion',
  'Trigonometry basics',
];

export default function ChatPage() {
  const { user, profile } = useAuth();
  const board = profile?.board || 'CBSE';
  const classLevel = profile?.class || 10;

  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(board, classLevel)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);

  // Initialise Gemini chat session once
  useEffect(() => {
    if (!user) return;
    chatSessionRef.current = geminiModel.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `I am a ${board} Class ${classLevel} student studying Science and Maths. Please help me learn using the Socratic method.` }],
        },
        {
          role: 'model',
          parts: [{ text: `Great! I'm your ${board} Class ${classLevel} AI tutor. Ask me any doubt in Science or Maths and I'll guide you step by step. What topic would you like to explore today?` }],
        },
      ],
    });
  }, [user, board, classLevel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      if (!chatSessionRef.current) {
        // Fallback: create session if not initialised
        chatSessionRef.current = geminiModel.startChat();
      }

      const result = await chatSessionRef.current.sendMessage(userText);
      const responseText = result.response.text();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Gemini chat error:', err);
      const errorText = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorText);

      // Add a fallback message so the user isn't left hanging
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I ran into an issue processing your question. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }

  const currentConcept = getCurrentConcept(messages);
  const sessionMastery = getSessionMastery(messages.length);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 pb-20 lg:pb-0">
      {/* Main Chat Column */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="animate-fade-in-up mb-6 border-b border-surface-700/50 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">AI Doubt Solver</h1>
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
              <span className="live-dot" />
              <span className="text-[10px] font-bold text-amber-400 uppercase">Online</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-400">Guided learning through the Socratic method — powered by Gemini AI</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-surface-700/40 bg-surface-900/50 p-6 backdrop-blur-sm">
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const keyTakeaway = msg.role === 'assistant' ? extractKeyTakeaway(msg.content) : null;
              const mainContent = keyTakeaway ? keyTakeaway.main : msg.content;

              return (
                <div
                  key={msg.id}
                  className={`flex animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-md border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-amber-600/10 px-4 py-3 shadow-lg shadow-amber-500/10">
                      <p className="whitespace-pre-wrap text-sm text-white leading-relaxed">
                        {renderMarkdownLike(msg.content)}
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-[80%] space-y-3">
                      <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3 border border-surface-700/40">
                        <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                          {renderMarkdownLike(mainContent)}
                        </p>
                      </div>
                      {keyTakeaway && (
                        <div className="rounded-xl border-l-4 border-amber-500/60 bg-amber-500/10 px-4 py-3 max-w-[80%]">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Key Takeaway</p>
                              <p className="mt-1 text-sm text-amber-100 leading-relaxed">
                                {renderMarkdownLike(keyTakeaway.takeaway)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="glass-card rounded-2xl rounded-bl-md px-5 py-3 border border-surface-700/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">AI is thinking</span>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" style={{ animation: 'bounce-subtle 1.4s infinite', animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-amber-400" style={{ animation: 'bounce-subtle 1.4s infinite', animationDelay: '200ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-300" style={{ animation: 'bounce-subtle 1.4s infinite', animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Suggestions */}
        {messages.length <= 1 && (
          <div className="stagger-children mt-4 flex flex-wrap gap-2">
            {['Explain Ohm\'s Law', 'Help with quadratic equations', 'What is photosynthesis?', 'Acids and bases'].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="stagger-item animate-fade-in-up glass-card-hover rounded-full border border-surface-600/40 px-4 py-2 text-xs font-medium text-slate-300 transition-all duration-300 hover:border-amber-500/60 hover:text-amber-400 hover:shadow-lg hover:shadow-amber-500/5"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="mt-4 flex gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your doubt..."
            className="flex-1 rounded-xl border border-surface-600/40 bg-surface-800/50 px-5 py-3.5 text-sm text-white placeholder-slate-500 backdrop-blur-sm transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-lg focus:shadow-amber-500/5"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="btn-glow rounded-xl px-6 py-3.5 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTyping ? '...' : 'Send'}
          </button>
        </form>
      </div>

      {/* Study Sanctum Sidebar - Desktop Only */}
      <div className="hidden lg:flex lg:w-80 flex-col gap-4">
        {/* Sanctum Header */}
        <div className="rounded-xl border border-amber-500/15 p-4" style={{ background: '#0a101f' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl text-amber-400">📚</span>
            <h2 className="text-lg font-bold text-white">Study Sanctum</h2>
          </div>
          <p className="text-xs text-slate-500">Your personalized learning hub</p>
        </div>

        {/* Current Concept Card */}
        <div className="rounded-xl border border-amber-500/15 p-4" style={{ background: '#0a101f' }}>
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg text-amber-400 flex-shrink-0">💡</span>
            <h3 className="text-sm font-semibold text-white">Current Concept</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {currentConcept.length > 100 ? `${currentConcept.substring(0, 100)}...` : currentConcept}
          </p>
        </div>

        {/* Session Mastery Progress */}
        <div className="rounded-xl border border-amber-500/15 p-4" style={{ background: '#0a101f' }}>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Session Mastery</h3>
              <span className="text-xs font-bold text-amber-400">{sessionMastery}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-surface-700/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
              style={{ width: `${sessionMastery}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {Math.min(messages.length, 20)} of 20 interactions
          </p>
        </div>

        {/* Quick Topics */}
        <div className="rounded-xl border border-amber-500/15 p-4" style={{ background: '#0a101f' }}>
          <h3 className="mb-3 text-sm font-semibold text-white">Quick Topics</h3>
          <div className="space-y-2">
            {quickTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => setInput(topic)}
                className="w-full rounded-lg border border-surface-700/50 bg-surface-700/30 px-3 py-2 text-left text-xs text-slate-300 transition-all duration-200 hover:border-amber-500/40 hover:bg-surface-700/60 hover:text-amber-300 active:scale-95"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 80%, 100% { opacity: 0.4; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
