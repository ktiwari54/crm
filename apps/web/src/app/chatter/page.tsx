'use client';

import { FormEvent, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { formatDateTime, fullName } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField, inputClass, btnPrimary } from '@/components/ui/FormField';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type FeedPost = {
  id: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  author: { firstName: string; lastName: string };
};

export default function ChatterPage() {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const { data, loading, error, reload } = useFetch<FeedPost[]>('/chatter');

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      await apiFetch('/chatter', {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody('');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Chatter"
        description="Team feed — @mentions, deal updates, and internal collaboration"
      />

      <form onSubmit={handlePost} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <FormField label={`Post as ${user ? fullName(user.firstName, user.lastName) : 'you'}`}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share an update with the team..."
            rows={3}
            className={inputClass}
          />
        </FormField>
        <div className="mt-3 flex justify-end">
          <button type="submit" className={btnPrimary} disabled={posting || !body.trim()}>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {!loading && !error && data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.map((post) => (
              <div key={post.id} className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {post.author.firstName[0]}
                    {post.author.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {fullName(post.author.firstName, post.author.lastName)}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {formatDateTime(post.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{post.body}</p>
                    {post.entityType && post.entityId ? (
                      <p className="mt-1 text-xs text-blue-600">
                        on {post.entityType} record
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !error && data?.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">No posts yet. Start the conversation.</p>
        ) : null}
      </div>
    </div>
  );
}