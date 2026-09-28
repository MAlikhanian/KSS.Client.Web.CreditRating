import type { PersonSearchResult } from '@/components/common/person-search';

const PERSON_KEY   = 'cr-report-person';
const BROKERAGE_KEY = 'cr-report-brokerage-id';

export function saveReportPerson(person: PersonSearchResult | null) {
  if (typeof window === 'undefined') return;
  try {
    if (person) window.localStorage.setItem(PERSON_KEY, JSON.stringify(person));
    else window.localStorage.removeItem(PERSON_KEY);
  } catch {}
}

export function loadReportPerson(): PersonSearchResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PERSON_KEY);
    return raw ? (JSON.parse(raw) as PersonSearchResult) : null;
  } catch { return null; }
}

export function saveReportBrokerageId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(BROKERAGE_KEY, id);
    else window.localStorage.removeItem(BROKERAGE_KEY);
  } catch {}
}

export function loadReportBrokerageId(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(BROKERAGE_KEY) ?? ''; } catch { return ''; }
}
