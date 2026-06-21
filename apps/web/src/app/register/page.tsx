'use client';

import { useState } from 'react';
import { publicApiFetch } from '@/lib/publicApi';
import { FormField, inputClass, btnPrimary } from '@/components/ui/FormField';

export default function RegisterPage() {
  const [form, setForm] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await publicApiFetch('/public/leads', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-bold text-slate-900">Become a Customer</h1>
        <p className="text-sm text-slate-500">Register your interest — a rep will contact you within 1 business day</p>
      </header>

      <main className="mx-auto max-w-xl p-8">
        {submitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <p className="text-lg font-semibold text-green-900">Thank you!</p>
            <p className="mt-2 text-sm text-green-700">We received your registration for {form.companyName}.</p>
            <p className="mt-4 text-sm text-green-600">A sales representative will reach out to {form.email} shortly.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <FormField label="Company name *">
              <input className={inputClass} required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="First name">
                <input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </FormField>
              <FormField label="Last name">
                <input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Email *">
              <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
            <FormField label="Title">
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FormField>
            <FormField label="How can we help?">
              <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button type="submit" className={btnPrimary} disabled={loading}>
              {loading ? 'Submitting...' : 'Register'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}