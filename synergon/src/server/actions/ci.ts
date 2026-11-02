'use server';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { requireViewer, assertBusiness, updateUserState } from '../session';
import { getAccount } from '../data/accounts';
import { audit } from '../audit';

export async function toggleSuggestedAction(acctId: string, idx: number) {
  const v = await requireViewer('ci'); await getAccount(v, acctId); // authorises the account
  const k = acctId + idx;
  await updateUserState(v.id, s => ({ doneActions: { ...(s.doneActions || {}), [k]: !(s.doneActions || {})[k] } }));
  revalidatePath('/ci');
}

/** AI drafts an opportunity hypothesis for the account (needs human validation). CRM is never written. */
export async function draftHypothesis(acctId: string): Promise<{ ok: boolean; msg: string }> {
  const v = await requireViewer('ci'); assertBusiness(v);
  const a = await getAccount(v, acctId);
  if (a.hypotheses.includes(a.hyp)) return { ok: false, msg: 'Hypothesis already drafted for ' + a.name };
  await db.account.update({ where: { id: acctId }, data: { hypotheses: { push: a.hyp } } });
  await audit(v.name, 'Opportunity hypothesis drafted (AI)', a.name, 'AI');
  revalidatePath('/ci');
  return { ok: true, msg: 'AI drafted an opportunity hypothesis — validate before sharing' };
}
