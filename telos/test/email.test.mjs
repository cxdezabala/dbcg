// Tests de api/_lib/telos-email.js -- solo la parte pura (icsFor, buildNotification).
// sendMeetingNotification hace fetch a Resend y no se cubre aquí (efecto de red).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { icsFor, buildNotification } = await import('../../api/_lib/telos-email.js');

describe('telos-email: icsFor', () => {
  test('genera un VEVENT bien formado con las horas indicadas', () => {
    const ics = icsFor({
      uid: 'TL-R-00001',
      title: 'Telos · Ana (Retiro)',
      description: 'línea 1\nlínea 2',
      dateISO: '2026-09-01',
      time: '10:30',
    });
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /UID:TL-R-00001@telos\.dbcg\.es/);
    assert.match(ics, /DTSTART:20260901T103000/);
    assert.match(ics, /DTEND:20260901T110000/); // +30 min por defecto
    assert.match(ics, /SUMMARY:Telos · Ana \(Retiro\)/);
    assert.match(ics, /END:VEVENT/);
    assert.match(ics, /END:VCALENDAR/);
  });

  test('escapa saltos de línea y comas en la descripción', () => {
    const ics = icsFor({
      uid: 'x', title: 't', description: 'a, b\nc',
      dateISO: '2026-01-01', time: '09:00',
    });
    assert.match(ics, /DESCRIPTION:a\\, b\\nc/);
  });

  test('respeta durationMinutes personalizado', () => {
    const ics = icsFor({
      uid: 'x', title: 't', description: 'd',
      dateISO: '2026-01-01', time: '09:00', durationMinutes: 45,
    });
    assert.match(ics, /DTSTART:20260101T090000/);
    assert.match(ics, /DTEND:20260101T094500/);
  });
});

describe('telos-email: buildNotification', () => {
  test('arma el payload de Resend con asunto, texto y adjunto .ics', () => {
    const lead = {
      scenario_id: 'TL-R-00042',
      scenario_type: 'retirement',
      name: 'Ana Pérez',
      contact: 'ana@example.com',
      country: 'MX',
      current_age: 40,
      target_retirement_age: 65,
      annual_contribution: 12000,
      benchmark_future_value: 456000,
      meeting_date: '2026-09-01',
      meeting_time: '10:30',
      advisorUrl: 'https://dbcg.es/telos/advisor',
    };
    const payload = buildNotification(lead);
    assert.deepEqual(payload.to, ['constantino.dezabala@gmail.com']);
    assert.match(payload.subject, /Ana Pérez/);
    assert.match(payload.text, /Retiro/);
    assert.match(payload.text, /\$12,000/);
    assert.match(payload.text, /\$456,000/);
    assert.match(payload.text, /2026-09-01 a las 10:30/);
    assert.match(payload.text, /https:\/\/dbcg\.es\/telos\/advisor/);
    assert.equal(payload.attachments.length, 1);
    assert.equal(payload.attachments[0].filename, 'reunion-telos.ics');
    const decoded = Buffer.from(payload.attachments[0].content, 'base64').toString('utf8');
    assert.match(decoded, /BEGIN:VCALENDAR/);
  });

  test('marca el tipo Educación y usa las edades correctas', () => {
    const lead = {
      scenario_id: 'TL-E-00007',
      scenario_type: 'education',
      name: 'Carla',
      child_age: 5,
      parent_age: 38,
      annual_contribution: 3000,
      benchmark_future_value: 60000,
      meeting_date: '2026-10-10',
      meeting_time: '16:00',
    };
    const payload = buildNotification(lead);
    assert.match(payload.text, /Educación/);
    assert.match(payload.text, /Edad del hijo: 5/);
    assert.match(payload.text, /Tu edad \(padre\): 38/);
  });

  test('usa — cuando faltan campos opcionales', () => {
    const lead = {
      scenario_id: 'TL-R-00099',
      scenario_type: 'retirement',
      meeting_date: '2026-01-01',
      meeting_time: '09:00',
    };
    const payload = buildNotification(lead);
    assert.match(payload.text, /Lead: —/);
    assert.match(payload.text, /Contacto: —/);
  });
});
