import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0afe2a52bbcc96eaf6263d';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormDigimonSammlung() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Digimon Sammlung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="digimon_name">Name des Digimons</Label>
            <Input
              id="digimon_name"
              value={fields.digimon_name ?? ''}
              onChange={e => setFields(f => ({ ...f, digimon_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nummer">Sammlungsnummer</Label>
            <Input
              id="nummer"
              value={fields.nummer ?? ''}
              onChange={e => setFields(f => ({ ...f, nummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attribut">Attribut</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.attribut) === 'vaccine'}
                onClick={() => setFields(f => ({ ...f, attribut: (lookupKey(f.attribut) === 'vaccine' ? undefined : 'vaccine') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.attribut) === 'vaccine'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Vaccine
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.attribut) === 'virus'}
                onClick={() => setFields(f => ({ ...f, attribut: (lookupKey(f.attribut) === 'virus' ? undefined : 'virus') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.attribut) === 'virus'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Virus
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.attribut) === 'data'}
                onClick={() => setFields(f => ({ ...f, attribut: (lookupKey(f.attribut) === 'data' ? undefined : 'data') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.attribut) === 'data'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Data
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.attribut) === 'free'}
                onClick={() => setFields(f => ({ ...f, attribut: (lookupKey(f.attribut) === 'free' ? undefined : 'free') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.attribut) === 'free'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Free
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.attribut) === 'variable'}
                onClick={() => setFields(f => ({ ...f, attribut: (lookupKey(f.attribut) === 'variable' ? undefined : 'variable') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.attribut) === 'variable'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Variable
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="typ">Typ</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_drache"
                  checked={lookupKeys(fields.typ).includes('drache')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'drache'] : current.filter(k => k !== 'drache');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_drache" className="font-normal">Drache</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_tier"
                  checked={lookupKeys(fields.typ).includes('tier')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'tier'] : current.filter(k => k !== 'tier');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_tier" className="font-normal">Tier</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_vogel"
                  checked={lookupKeys(fields.typ).includes('vogel')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'vogel'] : current.filter(k => k !== 'vogel');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_vogel" className="font-normal">Vogel</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_insekt"
                  checked={lookupKeys(fields.typ).includes('insekt')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'insekt'] : current.filter(k => k !== 'insekt');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_insekt" className="font-normal">Insekt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_aquatisch"
                  checked={lookupKeys(fields.typ).includes('aquatisch')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'aquatisch'] : current.filter(k => k !== 'aquatisch');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_aquatisch" className="font-normal">Aquatisch</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_pflanze"
                  checked={lookupKeys(fields.typ).includes('pflanze')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'pflanze'] : current.filter(k => k !== 'pflanze');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_pflanze" className="font-normal">Pflanze</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_maschine"
                  checked={lookupKeys(fields.typ).includes('maschine')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'maschine'] : current.filter(k => k !== 'maschine');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_maschine" className="font-normal">Maschine</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_dunkel"
                  checked={lookupKeys(fields.typ).includes('dunkel')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'dunkel'] : current.filter(k => k !== 'dunkel');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_dunkel" className="font-normal">Dunkel</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_heilig"
                  checked={lookupKeys(fields.typ).includes('heilig')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'heilig'] : current.filter(k => k !== 'heilig');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_heilig" className="font-normal">Heilig</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="typ_unbekannt"
                  checked={lookupKeys(fields.typ).includes('unbekannt')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.typ);
                      const next = checked ? [...current, 'unbekannt'] : current.filter(k => k !== 'unbekannt');
                      return { ...f, typ: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="typ_unbekannt" className="font-normal">Unbekannt</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="erwerbsdatum">Erwerbsdatum</Label>
            <Input
              id="erwerbsdatum"
              type="date"
              value={fields.erwerbsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, erwerbsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zustand">Zustand</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'neu'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'neu' ? undefined : 'neu') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'neu'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Neu
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'sehr_gut'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'sehr_gut' ? undefined : 'sehr_gut') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'sehr_gut'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sehr gut
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'gut'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'gut' ? undefined : 'gut') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'gut'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Gut
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'akzeptabel'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'akzeptabel' ? undefined : 'akzeptabel') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'akzeptabel'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Akzeptabel
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.zustand) === 'beschaedigt'}
                onClick={() => setFields(f => ({ ...f, zustand: (lookupKey(f.zustand) === 'beschaedigt' ? undefined : 'beschaedigt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.zustand) === 'beschaedigt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Beschädigt
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="besonderheiten">Besonderheiten</Label>
            <Textarea
              id="besonderheiten"
              value={fields.besonderheiten ?? ''}
              onChange={e => setFields(f => ({ ...f, besonderheiten: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
