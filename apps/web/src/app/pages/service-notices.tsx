import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Info, RefreshCw, Send, X } from 'lucide-react';
import {
  noticeDraftSchema,
  noticeStatus,
  maintenanceWindowSchema,
  formatNoticeWindow,
  NOTICE_MESSAGE_LIMIT,
  NOTICE_TITLE_LIMIT,
} from '@oratio/shared/service-notice';
import {
  getNoticeAdminState,
  saveServiceNotice,
  NoticeApiError,
  type NoticeAdminState,
} from '../services/service-notice';

function localTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function utcTime(value: string) {
  const date = new Date(value);
  // Reject invalid dates and local times skipped by a daylight-saving transition.
  return Number.isFinite(date.getTime()) && localTime(date) === value ? date.toISOString() : '';
}
const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-surface p-3 text-text-primary [color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark]';
const buttonClass =
  'min-h-11 inline-flex items-center justify-center gap-2 rounded-lg px-4 disabled:opacity-40';

export function ServiceNotices() {
  const [state, setState] = useState<NoticeAdminState | null>(null);
  const [title, setTitle] = useState('Scheduled maintenance');
  const [message, setMessage] = useState('');
  const [startsAt, setStartsAt] = useState(() => localTime(new Date()));
  const [endsAt, setEndsAt] = useState(() => localTime(new Date(Date.now() + 3600_000)));
  const [includeMaintenance, setIncludeMaintenance] = useState(false);
  const [maintenanceStart, setMaintenanceStart] = useState('');
  const [maintenanceEnd, setMaintenanceEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getNoticeAdminState();
      setState(next);
      setDenied(false);
      setConflict(false);
      setError(null);
    } catch (error) {
      setDenied(error instanceof NoticeApiError && [401, 403].includes(error.status));
      setError(error instanceof Error ? error.message : 'Could not load notices.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const end = new Date(endsAt);
  const maintenance = {
    startsAt: utcTime(maintenanceStart),
    endsAt: utcTime(maintenanceEnd),
  };
  const invalidMaintenance =
    includeMaintenance && !maintenanceWindowSchema.safeParse(maintenance).success;
  const draft = noticeDraftSchema.safeParse({
    title,
    message,
    startsAt: utcTime(startsAt),
    endsAt: utcTime(endsAt),
    ...(includeMaintenance ? { maintenance } : {}),
  });
  const valid = draft.success && end.getTime() > Date.now();
  const counts = {
    title: Array.from(title.trim()).length,
    message: Array.from(message.trim()).length,
  };
  const publish = async (remove = false) => {
    if (!state || saving || conflict || (!remove && !valid)) return;
    setSaving(true);
    setError(null);
    setConfirmation(null);
    try {
      await saveServiceNotice(remove ? null : draft.success ? draft.data : null, state.version);
      setPreview(false);
      setConfirmation(
        remove
          ? 'Notice withdrawn. Online apps will refresh within a minute.'
          : 'Notice saved. It will appear during the selected display window.'
      );
      // A completed write must never be retried with the old version, even if this reload fails.
      setState(null);
      await load();
    } catch (error) {
      if (error instanceof NoticeApiError && error.status === 409) setConflict(true);
      setError(
        error instanceof Error ? error.message : 'Could not save. Your draft has been kept.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-bg text-text-primary px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-2xl mx-auto">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 mb-6">
          <Link
            to="/moderate"
            aria-label="Back to moderation"
            title="Back to moderation"
            className="w-11 h-11 inline-flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-heading text-center">Service notices</h1>
          <button
            type="button"
            aria-label="Reload current notice"
            title="Reload current notice"
            disabled={saving || loading}
            onClick={() => void load()}
            className="w-11 h-11 inline-flex items-center justify-center disabled:opacity-40"
          >
            <RefreshCw size={18} />
          </button>
        </header>
        {confirmation && (
          <p role="status" className="mb-4 border-l-2 border-success pl-3">
            {confirmation}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-4 text-danger">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Loading notices</p>
        ) : denied ? (
          <p>Notice administrator access required</p>
        ) : !state ? (
          <button className={`${buttonClass} text-accent`} onClick={() => void load()}>
            Try again
          </button>
        ) : (
          <>
            <section className="border-y border-border py-4 mb-6">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="font-heading text-base">Current notice</h2>
                <span className="text-sm text-text-muted capitalize">
                  {noticeStatus(state.notice, now)}
                </span>
              </div>
              {state.notice ? (
                <>
                  <h3 className="mt-3 font-medium break-words [overflow-wrap:anywhere]">
                    {state.notice.title}
                  </h3>
                  {state.notice.maintenance && (
                    <p className="mt-1 text-sm text-accent break-words">
                      Maintenance: {formatNoticeWindow(state.notice.maintenance)}
                    </p>
                  )}
                  <p className="mt-1 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {state.notice.message}
                  </p>
                  <p className="my-3 text-xs text-text-muted">
                    Banner display: {formatNoticeWindow(state.notice)}
                  </p>
                  <button
                    type="button"
                    className={`${buttonClass} border border-border`}
                    disabled={saving || conflict}
                    onClick={() => {
                      if (window.confirm('Withdraw the current notice for everyone?'))
                        void publish(true);
                    }}
                  >
                    <X size={18} />
                    Withdraw notice
                  </button>
                </>
              ) : (
                <p className="mt-3 text-sm text-text-muted">No notice scheduled</p>
              )}
            </section>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) setPreview(true);
              }}
              className="space-y-5"
            >
              <h2 className="font-heading text-base">New notice</h2>
              <label className="block text-sm">
                Title
                <input
                  className={`${fieldClass} mt-2`}
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setPreview(false);
                  }}
                  disabled={saving}
                  aria-invalid={counts.title > NOTICE_TITLE_LIMIT}
                />
                <span
                  className={counts.title > NOTICE_TITLE_LIMIT ? 'text-danger' : 'text-text-muted'}
                >
                  {counts.title}/{NOTICE_TITLE_LIMIT}
                </span>
              </label>
              <label className="block text-sm">
                Message
                <textarea
                  rows={4}
                  className={`${fieldClass} mt-2 resize-y`}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setPreview(false);
                  }}
                  disabled={saving}
                  aria-invalid={counts.message > NOTICE_MESSAGE_LIMIT}
                />
                <span
                  className={
                    counts.message > NOTICE_MESSAGE_LIMIT ? 'text-danger' : 'text-text-muted'
                  }
                >
                  {counts.message}/{NOTICE_MESSAGE_LIMIT}
                </span>
              </label>
              <fieldset className="border-y border-border py-4 space-y-4">
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-accent"
                    checked={includeMaintenance}
                    disabled={saving}
                    onChange={(event) => {
                      setIncludeMaintenance(event.target.checked);
                      setPreview(false);
                    }}
                  />
                  Include maintenance times
                </label>
                {includeMaintenance && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="min-w-0 text-sm">
                      Maintenance starts
                      <input
                        type="datetime-local"
                        className={`${fieldClass} mt-2`}
                        value={maintenanceStart}
                        onChange={(event) => {
                          setMaintenanceStart(event.target.value);
                          setPreview(false);
                        }}
                        disabled={saving}
                        aria-invalid={invalidMaintenance}
                        aria-describedby={invalidMaintenance ? 'maintenance-error' : undefined}
                        required
                      />
                    </label>
                    <label className="min-w-0 text-sm">
                      Maintenance ends
                      <input
                        type="datetime-local"
                        className={`${fieldClass} mt-2`}
                        value={maintenanceEnd}
                        onChange={(event) => {
                          setMaintenanceEnd(event.target.value);
                          setPreview(false);
                        }}
                        disabled={saving}
                        aria-invalid={invalidMaintenance}
                        aria-describedby={invalidMaintenance ? 'maintenance-error' : undefined}
                        required
                      />
                    </label>
                  </div>
                )}
                {invalidMaintenance && (
                  <p id="maintenance-error" role="alert" className="text-sm text-danger">
                    Enter valid maintenance dates and times, with the end after the start.
                  </p>
                )}
              </fieldset>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="min-w-0 text-sm">
                  Display from
                  <input
                    type="datetime-local"
                    className={`${fieldClass} mt-2`}
                    value={startsAt}
                    onChange={(event) => {
                      setStartsAt(event.target.value);
                      setPreview(false);
                    }}
                    disabled={saving}
                    required
                  />
                </label>
                <label className="min-w-0 text-sm">
                  Expires at
                  <input
                    type="datetime-local"
                    className={`${fieldClass} mt-2`}
                    value={endsAt}
                    onChange={(event) => {
                      setEndsAt(event.target.value);
                      setPreview(false);
                    }}
                    disabled={saving}
                    required
                  />
                </label>
              </div>
              <p className="text-xs text-text-muted">
                Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Maximum display
                window: seven days.
              </p>
              {counts.title > NOTICE_TITLE_LIMIT || counts.message > NOTICE_MESSAGE_LIMIT ? (
                <p role="alert" className="text-sm text-danger">
                  Shorten the text to fit the character limits.
                </p>
              ) : (
                !valid &&
                !invalidMaintenance &&
                message.trim() && (
                  <p role="alert" className="text-sm text-danger">
                    Enter a title and valid display times, with a future expiry within seven days of
                    the start.
                  </p>
                )
              )}
              <button
                type="submit"
                className={`${buttonClass} border border-border`}
                disabled={!valid || saving || conflict}
              >
                Preview notice
              </button>
            </form>
            {preview && draft.success && (
              <section aria-label="Notice preview" className="mt-6 border-t border-border pt-5">
                <h2 className="font-heading text-base mb-3">Preview</h2>
                <div className="flex gap-3 border-y border-border bg-surface px-4 py-3">
                  <Info size={20} className="shrink-0 mt-1 text-accent" />
                  <div className="min-w-0">
                    <h3 className="font-medium break-words [overflow-wrap:anywhere]">
                      {draft.data.title}
                    </h3>
                    {draft.data.maintenance && (
                      <p className="text-sm mt-1 text-accent break-words">
                        Maintenance: {formatNoticeWindow(draft.data.maintenance)}
                      </p>
                    )}
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {draft.data.message}
                    </p>
                  </div>
                </div>
                <p className="my-4 text-sm text-text-muted">
                  Publishing replaces any current or scheduled notice for everyone.
                </p>
                <button
                  type="button"
                  className={`${buttonClass} bg-accent text-white`}
                  disabled={saving || conflict || !valid}
                  onClick={() => void publish()}
                >
                  <Send size={18} />
                  {saving ? 'Saving' : 'Publish notice'}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
