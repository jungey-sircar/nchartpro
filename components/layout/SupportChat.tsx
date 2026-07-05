'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'support';
  content: string;
  ts: Date;
}

const TOPICS = ['General', 'Dashboard Help', 'Index Data', 'Portfolio', 'Technical Support', 'Billing'];

const SUPPORT_REPLIES: Record<string, string[]> = {
  General:            ['Thanks for reaching out! How can I help you today?', 'Feel free to ask anything about NChartPro.'],
  'Dashboard Help':   ['The dashboard shows live NEPSE data, index metrics, gainers, losers and more.', 'You can customize which cards appear in Settings → Dashboard.'],
  'Index Data':       ['Index data refreshes every 30 seconds during market hours.', 'Historical data is available for all listed indices.'],
  Portfolio:          ['You can track your portfolio under Tools → Portfolio.', 'Portfolio P&L updates live during market hours.'],
  'Technical Support':['Please describe the issue you are facing and I\'ll assist you right away.', 'You can also email support@nchartpro.com for urgent issues.'],
  Billing:            ['For billing inquiries, visit Account → Billing or email billing@nchartpro.com.', 'Subscriptions can be managed anytime from your account settings.'],
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SupportChat() {
  const [open,    setOpen]    = useState(false);
  const [topic,   setTopic]   = useState(TOPICS[0]);
  const [msgs,    setMsgs]    = useState<Message[]>([{
    id: uid(), role: 'support', ts: new Date(),
    content: 'Hi! Welcome to NChartPro Support. Select a topic above and ask anything.',
  }]);
  const [input,   setInput]   = useState('');
  const [typing,  setTyping]  = useState(false);
  const [unread,  setUnread]  = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const threadRef  = useRef<string>(uid());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  useEffect(() => {
    if (open) { setUnread(0); inputRef.current?.focus(); }
  }, [open]);

  const handleTopicChange = useCallback((t: string) => {
    setTopic(t);
    threadRef.current = uid();
    const welcome: Message = {
      id: uid(), role: 'support', ts: new Date(),
      content: `Topic changed to "${t}". ${SUPPORT_REPLIES[t]?.[0] ?? 'How can I help?'}`,
    };
    setMsgs(prev => [...prev, welcome]);
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const userMsg: Message = { id: uid(), role: 'user', content: text, ts: new Date() };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const replies = SUPPORT_REPLIES[topic] ?? ['Thank you for your message. Our team will get back to you shortly.'];
      const reply   = replies[Math.floor(Math.random() * replies.length)];
      const botMsg: Message = { id: uid(), role: 'support', content: reply, ts: new Date() };
      setMsgs(prev => [...prev, botMsg]);
      setSending(false);
      if (!open) setUnread(n => n + 1);
    }, 1200 + Math.random() * 800);
  }, [input, sending, topic, open]);

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      {/* Floating button */}
      <button
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 900,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent)', color: 'var(--color-on-dark)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'var(--color-down)', color: 'var(--color-on-dark)',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
            border: '1.5px solid var(--bg-base)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 82, right: 20, zIndex: 900,
          width: 360, height: 500,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'chat-in 0.18s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 13px',
            background: 'var(--accent)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <SupportAvatar />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-on-dark)', lineHeight: 1.2 }}>NChartPro Support</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4ade80', marginRight: 4, verticalAlign: 'middle' }} />
                Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>
              ×
            </button>
          </div>

          {/* Topic selector */}
          <div style={{
            padding: '6px 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Topic:</span>
            <select
              value={topic}
              onChange={e => handleTopicChange(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                color: 'var(--text-primary)',
                fontSize: 11, fontWeight: 500,
                padding: '3px 6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map((msg, i) => {
              const isUser = msg.role === 'user';
              const showTs = i === 0 || msgs[i - 1].role !== msg.role || (msg.ts.getTime() - msgs[i - 1].ts.getTime()) > 60_000;
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  {showTs && (
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: isUser ? 0 : 28 }}>
                      {formatTime(msg.ts)}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                    {!isUser && (
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <SupportAvatar size={12} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '78%',
                      padding: '7px 10px',
                      borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                      background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: isUser ? 'var(--color-on-dark)' : 'var(--text-primary)',
                      border: isUser ? 'none' : '1px solid var(--border)',
                      fontSize: 12, lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SupportAvatar size={12} />
                </div>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '12px 12px 12px 3px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(j => (
                    <span key={j} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--text-muted)',
                      display: 'inline-block',
                      animation: 'dot-bounce 1.2s ease-in-out infinite',
                      animationDelay: `${j * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 10px',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 7, alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 12,
                padding: '7px 10px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
                maxHeight: 88,
                overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={e  => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={e   => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none',
                background: input.trim() && !sending ? 'var(--accent)' : 'var(--border)',
                color: 'var(--color-on-dark)', cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chat-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function SupportAvatar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
