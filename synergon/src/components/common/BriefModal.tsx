'use client';
import { Modal } from '@/components/ui/Modal';
import { useT } from '@/i18n/client';
import { useUI } from '@/components/shell/UIProvider';

export interface BriefData { title: string; sub: string; sections: { h: string; items: string[] }[] }

export function BriefModal({ brief, onClose, savedMsg = 'Briefing saved to your workspace' }: { brief: BriefData | null; onClose: () => void; savedMsg?: string }) {
  const t = useT();
  const { toast } = useUI();
  return (
    <Modal open={!!brief} onClose={onClose} label={brief?.title}>
      {brief && <>
        <div className="card-kicker">{t('Executive briefing · AI-generated · simulated')}</div>
        <div className="dialog-title" style={{ fontSize: 24 }}>{brief.title}</div>
        <div style={{ fontSize: 12 }} className="text-muted">{brief.sub}</div>
        {brief.sections.map(s => (
          <div key={s.h}><h6 style={{ marginBottom: 4 }}>{t(s.h)}</h6>{s.items.map((x, i) => <div key={i} style={{ fontSize: 14, padding: '5px 0', borderBottom: '1px solid var(--color-divider)' }}>{x}</div>)}</div>
        ))}
        <div className="dialog-actions"><button className="btn btn-secondary" onClick={onClose}>{t('Close')}</button><button className="btn btn-primary" onClick={() => { onClose(); toast(savedMsg); }}>{t('Save to workspace')}</button></div>
      </>}
    </Modal>
  );
}
