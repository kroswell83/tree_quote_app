// Vercel serverless function: records a customer's approve/decline for a quote.
// It uses the Firebase REST API with the project's public web config — the same
// config already in the app — and only ever touches the /approvals/{token} doc.
// Firestore rules (below) restrict what can be read/written here.

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// GET  /api/approve?t=TOKEN            -> returns the quote summary for that token
// POST /api/approve  {t, decision}     -> decision 'approved' | 'declined'
export default async function handler(req, res) {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
    return res.status(500).json({ error: 'Approvals are not configured on the server.' });
  }

  const token = (req.query && req.query.t) || (req.body && req.body.t);
  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(String(token))) {
    return res.status(400).json({ error: 'Invalid or missing approval token.' });
  }

  const docUrl = `${base()}/approvals/${encodeURIComponent(token)}?key=${FIREBASE_API_KEY}`;

  // --- GET: fetch the quote so the page can display it ---
  if (req.method === 'GET') {
    try {
      const r = await fetch(docUrl);
      if (!r.ok) return res.status(404).json({ error: 'This approval link is not valid or has expired.' });
      const doc = await r.json();
      const f = doc.fields || {};
      const val = (x) => (x ? (x.stringValue ?? x.integerValue ?? x.doubleValue ?? '') : '');
      return res.status(200).json({
        customerName: val(f.customerName),
        property: val(f.property),
        quoteText: val(f.quoteText),
        total: Number(val(f.total) || 0),
        status: val(f.status) || 'pending',
      });
    } catch (e) {
      return res.status(500).json({ error: 'Could not load the quote.' });
    }
  }

  // --- POST: record the decision ---
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const decision = body && body.decision;
    if (decision !== 'approved' && decision !== 'declined') {
      return res.status(400).json({ error: 'Invalid decision.' });
    }
    try {
      // read current so we don't let a decided quote be flipped again
      const cur = await fetch(docUrl);
      if (!cur.ok) return res.status(404).json({ error: 'This approval link is not valid or has expired.' });
      const curDoc = await cur.json();
      const curStatus = curDoc.fields?.status?.stringValue || 'pending';
      if (curStatus !== 'pending') {
        return res.status(409).json({ error: 'This quote has already been ' + curStatus + '.', status: curStatus });
      }
      // patch only status + decision timestamp, nothing else
      const patchUrl = `${base()}/approvals/${encodeURIComponent(token)}?key=${FIREBASE_API_KEY}` +
        `&updateMask.fieldPaths=status&updateMask.fieldPaths=approvedAt`;
      const patchBody = {
        fields: {
          status: { stringValue: decision },
          approvedAt: { stringValue: new Date().toISOString() },
        },
      };
      const pr = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      if (!pr.ok) {
        const err = await pr.json().catch(() => ({}));
        return res.status(500).json({ error: (err.error && err.error.message) || 'Could not record your decision.' });
      }
      return res.status(200).json({ ok: true, status: decision });
    } catch (e) {
      return res.status(500).json({ error: 'Could not record your decision.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
