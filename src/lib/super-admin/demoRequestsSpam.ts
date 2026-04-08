export interface DemoRequestLike {
  id?: string;
  name?: string;
  email?: string;
  company?: string;
  whatsapp?: string;
  employees?: string;
  message?: string;
  status?: string;
  /** Honeypot — if filled, it's a bot */
  website?: string;
  /** Timestamp when form was rendered (ms) */
  _ts?: number;
}

export interface SpamAnalysis {
  spamScore: number;
  isLikelySpam: boolean;
  reasons: string[];
}

const SPAM_WORDS = [
  'spam',
  'test',
  'asdf',
  'qwerty',
  'lorem',
  'ipsum',
  'viagra',
  'casino',
  'crypto',
  'buy now',
  'free money',
  'xxx',
  'click here',
  'seo',
  'backlink',
];

const SPAM_DOMAINS = [
  'example.com',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'throwaway.email',
  'dispostable.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'trashmail.com',
  'trashmail.me',
  'trashmail.net',
  'temp-mail.org',
  'fakeinbox.com',
  'maildrop.cc',
  'getairmail.com',
  'discard.email',
  'mohmal.com',
  'tempail.com',
  'emailondeck.com',
  'crazymailing.com',
  'mintemail.com',
  'mailcatch.com',
  'mfasa.com',
  'zep-hyr.com',
];

export function analyzeDemoRequestSpam(req: DemoRequestLike): SpamAnalysis {
  const reasons: string[] = [];
  let spamScore = 0;

  const name = String(req.name || '')
    .trim()
    .toLowerCase();
  const company = String(req.company || '')
    .trim()
    .toLowerCase();
  const email = String(req.email || '')
    .trim()
    .toLowerCase();
  const message = String(req.message || '')
    .trim()
    .toLowerCase();
  const whatsapp = String(req.whatsapp || '').replace(/\D/g, '');

  // ── Honeypot: instant kill ──
  if (req.website) {
    return {
      spamScore: 10,
      isLikelySpam: true,
      reasons: ['honeypot_triggered'],
    };
  }

  // ── Timing: form filled in < 3 seconds = bot ──
  if (req._ts) {
    const elapsed = Date.now() - req._ts;
    if (elapsed < 3000) {
      spamScore += 3;
      reasons.push('submit_demasiado_rapido');
    }
  }

  // ── Email domain ──
  const emailDomain = email.split('@')[1] || '';
  if (SPAM_DOMAINS.includes(emailDomain)) {
    spamScore += 3;
    reasons.push(`dominio_email_sospechoso:${emailDomain}`);
  }

  // ── Auto-generated email pattern (random chars + timestamp) ──
  const emailUser = email.split('@')[0] || '';
  if (
    /\d{10,}/.test(emailUser) ||
    /^[a-z]{2,3}\.\w+\.\w+\d{8,}$/.test(emailUser)
  ) {
    spamScore += 2;
    reasons.push('email_auto_generado');
  }

  // ── Spam words in fields ──
  if (SPAM_WORDS.some(w => name.includes(w))) {
    spamScore += 2;
    reasons.push('nombre_sospechoso');
  }
  if (SPAM_WORDS.some(w => company.includes(w))) {
    spamScore += 2;
    reasons.push('empresa_sospechosa');
  }
  if (message && SPAM_WORDS.some(w => message.includes(w))) {
    spamScore += 1;
    reasons.push('mensaje_sospechoso');
  }

  // ── Phone validation ──
  if (!whatsapp || whatsapp.length < 8) {
    spamScore += 1;
    reasons.push('telefono_invalido');
  }
  if (/^(\d)\1+$/.test(whatsapp) && whatsapp.length >= 8) {
    spamScore += 2;
    reasons.push('telefono_repetitivo');
  }

  // ── Name is gibberish (mostly consonants, no vowels) ──
  const vowelRatio =
    (name.match(/[aeiouáéíóú]/g) || []).length / (name.length || 1);
  if (name.length > 3 && vowelRatio < 0.15) {
    spamScore += 2;
    reasons.push('nombre_gibberish');
  }

  // ── Duplicate name = company (lazy bots copy fields) ──
  if (name && company && name === company) {
    spamScore += 1;
    reasons.push('nombre_igual_empresa');
  }

  return {
    spamScore,
    isLikelySpam: spamScore >= 2,
    reasons,
  };
}
