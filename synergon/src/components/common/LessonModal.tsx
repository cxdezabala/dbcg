'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useT } from '@/i18n/client';
import { useUI } from '@/components/shell/UIProvider';
import { completeLesson } from '@/server/actions/growth';
import type { Lesson } from '@/lib/demo/types';

export function LessonModal({ lesson, open, onClose }: { lesson: Lesson; open: boolean; onClose: () => void }) {
  const t = useT();
  const { toast } = useUI();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [, start] = useTransition();
  const close = () => { setStep(0); setQuiz({}); onClose(); };
  const score = lesson.quiz.filter((q, i) => quiz[i] === q.ok).length;
  const next = () => {
    if (step < 3) setStep(step + 1);
    else if (step === 3) {
      if (Object.keys(quiz).length < 2) { toast('Answer both questions'); return; }
      setStep(4);
      start(async () => { await completeLesson(score); router.refresh(); });
    } else close();
  };
  const progress = step < 3 ? 'Card ' + (step + 1) + ' of 3' : step === 3 ? 'Knowledge check' : 'Complete';
  return (
    <Modal open={open} onClose={close} label={lesson.title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div className="card-kicker">{t('5-minute lesson')} · {t(progress)}</div><span className="tag tag-neutral">{t('Contextual')} · Meridian</span></div>
      <div className="dialog-title" style={{ fontSize: 22 }}>{t(lesson.title)}</div>
      <div style={{ display: 'flex', gap: 3 }}>{[0, 1, 2, 3, 4].map(i => <span key={i} style={{ flex: 1, height: 4, background: i <= step ? 'var(--color-accent)' : 'var(--color-neutral-300)' }} />)}</div>
      {step < 3 && (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 44, color: 'var(--color-accent)' }}>0{step + 1}</div>
          <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 8 }}>{lesson.cards[step][0]}</div>
          <p style={{ margin: 0, fontSize: 15 }}>{lesson.cards[step][1]}</p>
        </div>
      )}
      {step === 3 && lesson.quiz.map((q, qi) => {
        const ans = quiz[qi];
        return (
          <div key={qi} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{q.q}</div>
            {q.opts.map((label, i) => (
              <button key={i} type="button" data-testid={`quiz-${qi}-${i}`} onClick={() => setQuiz({ ...quiz, [qi]: i })}
                style={{ all: 'unset', cursor: 'pointer', padding: '8px 10px', fontSize: 13, border: '2px solid ' + (ans === i ? (i === q.ok ? 'var(--color-text)' : 'var(--color-accent)') : 'var(--color-divider)'), background: ans != null && i === q.ok ? 'var(--color-neutral-200)' : 'transparent' }}>{label}</button>
            ))}
            {ans != null && <div style={{ fontSize: 12, color: 'var(--color-accent-700)' }}>{ans === q.ok ? t('Correct.') : t('Not quite — the strongest answer is:') + ' ' + q.opts[q.ok]}</div>}
          </div>
        );
      })}
      {step === 4 && (
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 19 }}>{t('Lesson completed')} — {score} {t('of 2 correct')}</div>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>{t('Recorded as learning activity. Your Business Acumen level changes only when you demonstrate it — for example when your Meridian business case passes review.')}</p>
        </div>
      )}
      <div className="dialog-actions">
        <button className="btn btn-secondary" onClick={close}>{t('Close')}</button>
        <button className="btn btn-primary" onClick={next}>{t(step < 2 ? 'Next' : step === 2 ? 'Knowledge check' : step === 3 ? 'Complete lesson' : 'Done')}</button>
      </div>
    </Modal>
  );
}
