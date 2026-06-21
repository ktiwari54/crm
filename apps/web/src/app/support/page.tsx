'use client';

import { useState } from 'react';
import { publicApiFetch } from '@/lib/publicApi';
import { FormField, inputClass, btnPrimary } from '@/components/ui/FormField';

export default function SupportPage() {
  const [form, setForm] = useState({
    email: '',
    companyName: '',
    firstName: '',
    lastName: '',
    subject: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState<{ caseNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await publicApiFetch<{ caseNumber: string }>('/public/cases', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmitted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-bold text-slate-900">Support Center</h1>
        <p className="text-sm text-slate-500">Submit a case — our team will respond within 24 hours</p>
      </header>

      <main className="mx-auto max-w-xl p-8">
        {submitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <p className="text-lg font-semibold text-green-900">Case submitted</p>
            <p className="mt-2 text-sm text-green-700">Reference: {submitted.caseNumber}</p>
            <p className="mt-4 text-sm text-green-600">We&apos;ll email you at {form.email} with updates.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <FormField label="Email *">
              <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label="Company">
              <input className={inputClass} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="First name">
                <input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </FormField>
              <FormField label="Last name">
                <input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Subject *">
              <input className={inputClass} required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </FormField>
            <FormField label="Description">
              <textarea className={inputClass} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" className={btnPrimary} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Case'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}