'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { apiFetch } from '@/lib/api';
import { btnPrimary, inputClass } from '@/components/ui/FormField';

type Insight = {
  id: string;
  title: string;
  content: string;
  insightType: string;
  score: string | null;
};

type ChatMessage = { role: string; content: string };

export default function CopilotPage() {
  const actions = useFetch<Insight[]>('/copilot/next-best-actions');
  const predictions = useFetch<Insight[]>('/copilot/reorder-predictions');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const [sending, setSending] = useState(false);

  const suggestions = [
    'What should I do today?',
    'Show reorder predictions',
    'Show at risk accounts',
    'Pipeline forecast',
    'How many open cases?',
  ];

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    try {
      const res = await apiFetch<{ sessionId: string; reply: string; messages: ChatMessage[] }>('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, sessionId }),
      });
      setSessionId(res.sessionId);
      setMessages(res.messages);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: e instanceof Error ? e.message : 'Error' }]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="p-8">
      <PageHeader title="AI Copilot" description="Reorder predictions, next-best-actions, and conversational CRM assistant" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">Next Best Actions</p>
            {actions.loading ? <LoadingState /> : null}
            {actions.data?.map((a) => (
              <div key={a.id} className="mb-2 rounded-lg bg-blue-50 p-3 text-sm">
                <p className="font-medium text-blue-900">{a.title}</p>
                <p className="text-blue-700">{a.content}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">Reorder Predictions</p>
            {predictions.loading ? <LoadingState /> : null}
            {predictions.data?.map((p) => (
              <div key={p.id} className="mb-2 rounded-lg bg-emerald-50 p-3 text-sm">
                <p className="font-medium text-emerald-900">{p.title}</p>
                <p className="text-emerald-700">{p.content}</p>
                {p.score ? <p className="mt-1 text-xs text-emerald-600">{Math.round(Number(p.score) * 100)}% confidence</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: 400 }}>
            {messages.length === 0 ? (
              <div className="text-center text-slate-500">
                <p className="mb-4">Ask me anything about your CRM data.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200" onClick={() => sendMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 p-4">
            <input className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Copilot..." disabled={sending} />
            <button type="submit" className={btnPrimary} disabled={sending}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}