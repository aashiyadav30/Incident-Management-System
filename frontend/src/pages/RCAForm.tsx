import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { RcaFormData } from '@/types';

// ─── Form field component ─────────────────────────────────────────────────────

function Field({
  label, name, value, onChange, multiline = false,
  type = 'text', required = true, hint,
}: {
  label:      string;
  name:       keyof RcaFormData;
  value:      string;
  onChange:   (name: keyof RcaFormData, val: string) => void;
  multiline?: boolean;
  type?:      string;
  required?:  boolean;
  hint?:      string;
}) {
  const base = 'w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent';

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={e => onChange(name, e.target.value)}
          rows={3}
          required={required}
          className={base}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={e => onChange(name, e.target.value)}
          required={required}
          className={base}
        />
      )}
    </div>
  );
}

// ─── RCA Form page ────────────────────────────────────────────────────────────

const EMPTY: RcaFormData = {
  root_cause:         '',
  fix_applied:        '',
  prevention_steps:   '',
  impact_start_time:  '',
  impact_end_time:    '',
  submitted_by:       '',
};

export function RCAForm() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form,        setForm]        = useState<RcaFormData>(EMPTY);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  function handleChange(name: keyof RcaFormData, val: string) {
    setForm(prev => ({ ...prev, [name]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side: end must be after start
    if (form.impact_end_time <= form.impact_start_time) {
      setError('Impact end time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      await api.incidents.submitRca(id!, form);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md space-y-4 shadow-sm">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900">RCA Submitted</h2>
          <p className="text-sm text-gray-500">
            You can now close this incident from the detail page.
          </p>
          <button
            onClick={() => navigate(`/incidents/${id}`)}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-900 transition-colors"
          >
            Back to Incident
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(`/incidents/${id}`)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Submit Root Cause Analysis</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Info banner */}
          <div className="bg-purple-50 border border-purple-200 text-purple-800 text-sm px-4 py-3 rounded-lg">
            📋 RCA is required before closing an incident. Be thorough — this
            document helps prevent recurrence.
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Analysis
            </h2>

            <Field
              label="Root Cause Category"
              name="root_cause"
              value={form.root_cause}
              onChange={handleChange}
              multiline
              hint="e.g. Misconfiguration, Traffic spike, Dependency failure, Human error"
            />

            <Field
              label="Fix Applied"
              name="fix_applied"
              value={form.fix_applied}
              onChange={handleChange}
              multiline
              hint="Describe exactly what was done to restore service"
            />

            <Field
              label="Prevention Steps"
              name="prevention_steps"
              value={form.prevention_steps}
              onChange={handleChange}
              multiline
              hint="What changes will prevent this from happening again?"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Impact Window
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Impact Start"
                name="impact_start_time"
                value={form.impact_start_time}
                onChange={handleChange}
                type="datetime-local"
              />
              <Field
                label="Impact End"
                name="impact_end_time"
                value={form.impact_end_time}
                onChange={handleChange}
                type="datetime-local"
              />
            </div>

            <Field
              label="Submitted By"
              name="submitted_by"
              value={form.submitted_by}
              onChange={handleChange}
              required={false}
              hint="Your name or team (optional)"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/incidents/${id}`)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors"
            >
              {submitting ? 'Submitting...' : '📋 Submit RCA'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}