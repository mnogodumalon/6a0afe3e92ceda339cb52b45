import { useState, useEffect, useRef, useCallback } from 'react';
import type { DigimonSammlung, Entwicklungsstufen, Fundorte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, uploadFile, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface DigimonSammlungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: DigimonSammlung['fields']) => Promise<void>;
  defaultValues?: DigimonSammlung['fields'];
  entwicklungsstufenList: Entwicklungsstufen[];
  fundorteList: Fundorte[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function DigimonSammlungDialog({ open, onClose, onSubmit, defaultValues, entwicklungsstufenList, fundorteList, enablePhotoScan = true, enablePhotoLocation = true }: DigimonSammlungDialogProps) {
  const [fields, setFields] = useState<Partial<DigimonSammlung['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'digimon_sammlung');
      await onSubmit(clean as DigimonSammlung['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="entwicklungsstufe" entity="Entwicklungsstufen">\n${JSON.stringify(entwicklungsstufenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="fundort" entity="Fundorte">\n${JSON.stringify(fundorteList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "digimon_name": string | null, // Name des Digimons\n  "nummer": string | null, // Sammlungsnummer\n  "entwicklungsstufe": string | null, // Display name from Entwicklungsstufen (see <available-records>)\n  "attribut": LookupValue | null, // Attribut (select one key: "vaccine" | "virus" | "data" | "free" | "variable") mapping: vaccine=Vaccine, virus=Virus, data=Data, free=Free, variable=Variable\n  "typ": LookupValue[] | null, // Typ (select one or more keys: "drache" | "tier" | "vogel" | "insekt" | "aquatisch" | "pflanze" | "maschine" | "dunkel" | "heilig" | "unbekannt") mapping: drache=Drache, tier=Tier, vogel=Vogel, insekt=Insekt, aquatisch=Aquatisch, pflanze=Pflanze, maschine=Maschine, dunkel=Dunkel, heilig=Heilig, unbekannt=Unbekannt\n  "fundort": string | null, // Display name from Fundorte (see <available-records>)\n  "erwerbsdatum": string | null, // YYYY-MM-DD\n  "zustand": LookupValue | null, // Zustand (select one key: "neu" | "sehr_gut" | "gut" | "akzeptabel" | "beschaedigt") mapping: neu=Neu, sehr_gut=Sehr gut, gut=Gut, akzeptabel=Akzeptabel, beschaedigt=Beschädigt\n  "besonderheiten": string | null, // Besonderheiten\n  "notizen": string | null, // Notizen\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["entwicklungsstufe", "fundort"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const entwicklungsstufeName = raw['entwicklungsstufe'] as string | null;
        if (entwicklungsstufeName) {
          const entwicklungsstufeMatch = entwicklungsstufenList.find(r => matchName(entwicklungsstufeName!, [String(r.fields.name ?? '')]));
          if (entwicklungsstufeMatch) merged['entwicklungsstufe'] = createRecordUrl(APP_IDS.ENTWICKLUNGSSTUFEN, entwicklungsstufeMatch.record_id);
        }
        const fundortName = raw['fundort'] as string | null;
        if (fundortName) {
          const fundortMatch = fundorteList.find(r => matchName(fundortName!, [String(r.fields.ortsname ?? '')]));
          if (fundortMatch) merged['fundort'] = createRecordUrl(APP_IDS.FUNDORTE, fundortMatch.record_id);
        }
        return merged as Partial<DigimonSammlung['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, bild: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Digimon Sammlung bearbeiten' : 'Digimon Sammlung hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>
        {enablePhotoScan && (
          <details className="group border-b bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3 text-sm font-medium hover:bg-muted/40 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <IconSparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="flex-1">Mit Foto/Text füllen</span>
              <span className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</span>
              <IconChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-4 pt-1 space-y-3">
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            </div>
          </details>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="digimon_name">Name des Digimons</Label>
            <Input
              id="digimon_name"
              value={fields.digimon_name ?? ''}
              onChange={e => setFields(f => ({ ...f, digimon_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nummer">Sammlungsnummer</Label>
            <Input
              id="nummer"
              value={fields.nummer ?? ''}
              onChange={e => setFields(f => ({ ...f, nummer: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entwicklungsstufe">Entwicklungsstufe</Label>
            <Combobox
              id="entwicklungsstufe"
              items={entwicklungsstufenList.map(r => ({
                id: r.record_id,
                label: String(r.fields.name ?? r.record_id),
              }))}
              value={extractRecordId(fields.entwicklungsstufe)}
              onChange={id => setFields(f => ({ ...f, entwicklungsstufe: id ? createRecordUrl(APP_IDS.ENTWICKLUNGSSTUFEN, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="fundort">Fundort</Label>
            <Combobox
              id="fundort"
              items={fundorteList.map(r => ({
                id: r.record_id,
                label: String(r.fields.ortsname ?? r.record_id),
              }))}
              value={extractRecordId(fields.fundort)}
              onChange={id => setFields(f => ({ ...f, fundort: id ? createRecordUrl(APP_IDS.FUNDORTE, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="erwerbsdatum">Erwerbsdatum</Label>
            <Input
              id="erwerbsdatum"
              type="date"
              value={fields.erwerbsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, erwerbsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label htmlFor="besonderheiten">Besonderheiten</Label>
            <Textarea
              id="besonderheiten"
              value={fields.besonderheiten ?? ''}
              onChange={e => setFields(f => ({ ...f, besonderheiten: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bild">Bild des Digimons</Label>
            {fields.bild ? (
              <div className="flex items-center gap-3 rounded-lg border p-2">
                <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconFileText size={20} className="text-muted-foreground" />
                  </div>
                  <img
                    src={fields.bild}
                    alt=""
                    className="relative h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">{fields.bild.split("/").pop()}</p>
                  <div className="flex gap-2 mt-1">
                    <label
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Ändern
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const fileUrl = await uploadFile(file, file.name);
                            setFields(f => ({ ...f, bild: fileUrl }));
                          } catch (err) { console.error('Upload failed:', err); }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setFields(f => ({ ...f, bild: undefined }))}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <IconUpload size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Datei hochladen</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fileUrl = await uploadFile(file, file.name);
                      setFields(f => ({ ...f, bild: fileUrl }));
                    } catch (err) { console.error('Upload failed:', err); }
                  }}
                />
              </label>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea
              id="notizen"
              value={fields.notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
              rows={3}
            />
          </div>
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}