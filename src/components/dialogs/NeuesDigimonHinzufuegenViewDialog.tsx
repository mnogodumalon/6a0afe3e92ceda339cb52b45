import type { NeuesDigimonHinzufuegen, Entwicklungsstufen, Fundorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface NeuesDigimonHinzufuegenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: NeuesDigimonHinzufuegen | null;
  onEdit: (record: NeuesDigimonHinzufuegen) => void;
  entwicklungsstufenList: Entwicklungsstufen[];
  fundorteList: Fundorte[];
}

export function NeuesDigimonHinzufuegenViewDialog({ open, onClose, record, onEdit, entwicklungsstufenList, fundorteList }: NeuesDigimonHinzufuegenViewDialogProps) {
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
          <DialogTitle>Neues Digimon hinzufügen anzeigen</DialogTitle>
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
            <p className="text-sm">{record.fields.name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entwicklungsstufe</Label>
            <p className="text-sm">{getEntwicklungsstufenDisplayName(record.fields.entwicklungsstufe_auswahl)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fundort</Label>
            <p className="text-sm">{getFundorteDisplayName(record.fields.fundort_auswahl)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erwerbsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kurze Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.schnellnotizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}