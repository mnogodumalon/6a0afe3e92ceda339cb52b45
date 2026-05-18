import type { DigimonSammlung, Entwicklungsstufen, Fundorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface DigimonSammlungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: DigimonSammlung | null;
  onEdit: (record: DigimonSammlung) => void;
  entwicklungsstufenList: Entwicklungsstufen[];
  fundorteList: Fundorte[];
}

export function DigimonSammlungViewDialog({ open, onClose, record, onEdit, entwicklungsstufenList, fundorteList }: DigimonSammlungViewDialogProps) {
  function getEntwicklungsstufenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return entwicklungsstufenList.find(r => r.record_id === id)?.fields.name ?? '—';
  }

  function getFundorteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return fundorteList.find(r => r.record_id === id)?.fields.ortsname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Digimon Sammlung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name des Digimons</Label>
            <p className="text-sm">{record.fields.digimon_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sammlungsnummer</Label>
            <p className="text-sm">{record.fields.nummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entwicklungsstufe</Label>
            <p className="text-sm">{getEntwicklungsstufenDisplayName(record.fields.entwicklungsstufe)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Attribut</Label>
            <Badge variant="secondary">{record.fields.attribut?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ</Label>
            <p className="text-sm">{Array.isArray(record.fields.typ) ? record.fields.typ.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundort</Label>
            <p className="text-sm">{getFundorteDisplayName(record.fields.fundort)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erwerbsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.erwerbsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand</Label>
            <Badge variant="secondary">{record.fields.zustand?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Besonderheiten</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.besonderheiten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bild des Digimons</Label>
            {record.fields.bild ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.bild} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}