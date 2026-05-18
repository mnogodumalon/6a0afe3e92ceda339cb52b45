import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichDigimonSammlung } from '@/lib/enrich';
import type { EnrichedDigimonSammlung } from '@/types/enriched';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DigimonSammlungDialog } from '@/components/dialogs/DigimonSammlungDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle,
  IconTool,
  IconRefresh,
  IconCheck,
  IconPlus,
  IconPencil,
  IconTrash,
  IconDatabase,
  IconStar,
  IconCalendar,
  IconShield,
  IconFilter,
  IconX,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a0afe3e92ceda339cb52b45';
const REPAIR_ENDPOINT = '/claude/build/repair';

const ATTRIBUT_COLORS: Record<string, string> = {
  vaccine: 'bg-blue-100 text-blue-800',
  virus: 'bg-red-100 text-red-800',
  data: 'bg-purple-100 text-purple-800',
  free: 'bg-green-100 text-green-800',
  variable: 'bg-yellow-100 text-yellow-800',
};

const ZUSTAND_COLORS: Record<string, string> = {
  neu: 'bg-emerald-100 text-emerald-800',
  sehr_gut: 'bg-green-100 text-green-800',
  gut: 'bg-lime-100 text-lime-800',
  akzeptabel: 'bg-yellow-100 text-yellow-800',
  beschaedigt: 'bg-red-100 text-red-800',
};

export default function DashboardOverview() {
  const {
    entwicklungsstufen, fundorte, digimonSammlung,
    entwicklungsstufenMap, fundorteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedDigimonSammlung = enrichDigimonSammlung(digimonSammlung, { entwicklungsstufenMap, fundorteMap });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedDigimonSammlung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedDigimonSammlung | null>(null);
  const [filterStufe, setFilterStufe] = useState<string>('alle');
  const [filterAttribut, setFilterAttribut] = useState<string>('alle');
  const [filterTyp, setFilterTyp] = useState<string>('alle');
  const [filterZustand, setFilterZustand] = useState<string>('alle');

  const allTypes = useMemo(() => {
    const typen = new Set<string>();
    enrichedDigimonSammlung.forEach(d => {
      d.fields.typ?.forEach(t => typen.add(t.key));
    });
    return Array.from(typen);
  }, [enrichedDigimonSammlung]);

  const filtered = useMemo(() => {
    return enrichedDigimonSammlung.filter(d => {
      if (filterStufe !== 'alle' && d.entwicklungsstufeName !== filterStufe) return false;
      if (filterAttribut !== 'alle' && d.fields.attribut?.key !== filterAttribut) return false;
      if (filterTyp !== 'alle' && !d.fields.typ?.some(t => t.key === filterTyp)) return false;
      if (filterZustand !== 'alle' && d.fields.zustand?.key !== filterZustand) return false;
      return true;
    });
  }, [enrichedDigimonSammlung, filterStufe, filterAttribut, filterTyp, filterZustand]);

  const stufenLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    entwicklungsstufen.forEach(s => { labels[s.fields.name ?? s.record_id] = s.fields.name ?? s.record_id; });
    return labels;
  }, [entwicklungsstufen]);

  const uniqueStufen = useMemo(() => {
    const stufen = new Set<string>();
    enrichedDigimonSammlung.forEach(d => {
      if (d.entwicklungsstufeName) stufen.add(d.entwicklungsstufeName);
    });
    return Array.from(stufen);
  }, [enrichedDigimonSammlung]);

  const hasActiveFilter = filterStufe !== 'alle' || filterAttribut !== 'alle' || filterTyp !== 'alle' || filterZustand !== 'alle';

  const statsByAttribut = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedDigimonSammlung.forEach(d => {
      const key = d.fields.attribut?.label ?? 'Unbekannt';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [enrichedDigimonSammlung]);

  const neuesteDigimon = useMemo(() => {
    return [...enrichedDigimonSammlung]
      .filter(d => d.fields.erwerbsdatum)
      .sort((a, b) => (b.fields.erwerbsdatum ?? '').localeCompare(a.fields.erwerbsdatum ?? ''))
      .slice(0, 3);
  }, [enrichedDigimonSammlung]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteDigimonSammlungEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleOpenEdit = (d: EnrichedDigimonSammlung) => {
    setEditRecord(d);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditRecord(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(enrichedDigimonSammlung.length)}
          description="Digimon gesammelt"
          icon={<IconDatabase size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Entwicklungsstufen"
          value={String(entwicklungsstufen.length)}
          description="verschiedene Stufen"
          icon={<IconStar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Fundorte"
          value={String(fundorte.length)}
          description="bekannte Quellen"
          icon={<IconShield size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Zuletzt erworben"
          value={neuesteDigimon[0]?.fields.digimon_name ?? '–'}
          description={neuesteDigimon[0]?.fields.erwerbsdatum ? formatDate(neuesteDigimon[0].fields.erwerbsdatum) : 'Keine Einträge'}
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Hauptbereich */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-lg truncate">Meine Sammlung</h2>
            <Badge variant="secondary" className="shrink-0">{filtered.length}</Badge>
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="shrink-0">
            <IconPlus size={16} className="mr-1 shrink-0" />
            <span>Digimon hinzufügen</span>
          </Button>
        </div>

        {/* Filter-Leiste */}
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b bg-muted/30">
          <IconFilter size={16} className="text-muted-foreground shrink-0 mt-0.5" />

          {/* Entwicklungsstufe */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterStufe('alle')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStufe === 'alle' ? 'bg-primary text-primary-foreground' : 'bg-background border hover:bg-accent'}`}
            >
              Alle Stufen
            </button>
            {uniqueStufen.map(stufe => (
              <button
                key={stufe}
                onClick={() => setFilterStufe(stufe === filterStufe ? 'alle' : stufe)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStufe === stufe ? 'bg-primary text-primary-foreground' : 'bg-background border hover:bg-accent'}`}
              >
                {stufe}
              </button>
            ))}
          </div>

          {/* Attribut */}
          <div className="flex flex-wrap gap-1">
            {['vaccine', 'virus', 'data', 'free', 'variable'].map(attr => {
              const label = attr.charAt(0).toUpperCase() + attr.slice(1);
              return (
                <button
                  key={attr}
                  onClick={() => setFilterAttribut(filterAttribut === attr ? 'alle' : attr)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterAttribut === attr ? 'bg-primary text-primary-foreground' : 'bg-background border hover:bg-accent'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Zustand */}
          <div className="flex flex-wrap gap-1">
            {['neu', 'sehr_gut', 'gut', 'akzeptabel', 'beschaedigt'].map(z => {
              const labels: Record<string, string> = { neu: 'Neu', sehr_gut: 'Sehr gut', gut: 'Gut', akzeptabel: 'Akzeptabel', beschaedigt: 'Beschädigt' };
              return (
                <button
                  key={z}
                  onClick={() => setFilterZustand(filterZustand === z ? 'alle' : z)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterZustand === z ? 'bg-primary text-primary-foreground' : 'bg-background border hover:bg-accent'}`}
                >
                  {labels[z]}
                </button>
              );
            })}
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => { setFilterStufe('alle'); setFilterAttribut('alle'); setFilterTyp('alle'); setFilterZustand('alle'); }}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <IconX size={12} className="shrink-0" />
              Filter zurücksetzen
            </button>
          )}
        </div>

        {/* Kartenraster */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <IconDatabase size={48} stroke={1.5} />
            <p className="text-sm font-medium">Keine Digimon gefunden</p>
            <p className="text-xs">Ändere die Filter oder füge ein neues Digimon hinzu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
            {filtered.map(digimon => (
              <DigimonCard
                key={digimon.record_id}
                digimon={digimon}
                onEdit={() => handleOpenEdit(digimon)}
                onDelete={() => setDeleteTarget(digimon)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Attribut-Statistiken */}
      {Object.keys(statsByAttribut).length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Attribute in der Sammlung</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(statsByAttribut).sort((a, b) => b[1] - a[1]).map(([attr, count]) => (
              <div key={attr} className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2">
                <span className="font-semibold text-lg">{count}</span>
                <span className="text-sm text-muted-foreground">{attr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialoge */}
      <DigimonSammlungDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateDigimonSammlungEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createDigimonSammlungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        entwicklungsstufenList={entwicklungsstufen}
        fundorteList={fundorte}
        enablePhotoScan={AI_PHOTO_SCAN['DigimonSammlung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Digimon entfernen"
        description={`"${deleteTarget?.fields.digimon_name ?? 'Digimon'}" wirklich aus der Sammlung entfernen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DigimonCard({
  digimon,
  onEdit,
  onDelete,
}: {
  digimon: EnrichedDigimonSammlung;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const attrKey = digimon.fields.attribut?.key ?? '';
  const attrLabel = digimon.fields.attribut?.label;
  const zustandKey = digimon.fields.zustand?.key ?? '';
  const zustandLabel = digimon.fields.zustand?.label;
  const typen = digimon.fields.typ ?? [];

  return (
    <div className="group rounded-2xl border bg-background overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Bild */}
      <div className="relative bg-muted/40 flex items-center justify-center overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {digimon.fields.bild ? (
          <img
            src={digimon.fields.bild}
            alt={digimon.fields.digimon_name ?? 'Digimon'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <IconDatabase size={32} stroke={1.5} />
            <span className="text-xs">Kein Bild</span>
          </div>
        )}
        {digimon.fields.nummer && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-mono px-2 py-0.5 rounded-lg">
            #{digimon.fields.nummer}
          </div>
        )}
        {attrLabel && (
          <div className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${ATTRIBUT_COLORS[attrKey] ?? 'bg-gray-100 text-gray-800'}`}>
            {attrLabel}
          </div>
        )}
      </div>

      {/* Inhalt */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{digimon.fields.digimon_name ?? 'Unbenannt'}</h3>
          {digimon.entwicklungsstufeName && (
            <p className="text-xs text-muted-foreground truncate">{digimon.entwicklungsstufeName}</p>
          )}
        </div>

        {typen.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {typen.slice(0, 3).map(t => (
              <span key={t.key} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {t.label}
              </span>
            ))}
            {typen.length > 3 && (
              <span className="text-xs text-muted-foreground">+{typen.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          <div className="flex items-center gap-2 min-w-0">
            {zustandLabel && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ZUSTAND_COLORS[zustandKey] ?? 'bg-gray-100 text-gray-800'}`}>
                {zustandLabel}
              </span>
            )}
            {digimon.fields.erwerbsdatum && (
              <span className="text-xs text-muted-foreground truncate">{formatDate(digimon.fields.erwerbsdatum)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Bearbeiten"
            >
              <IconPencil size={14} className="shrink-0" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              title="Löschen"
            >
              <IconTrash size={14} className="shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
