// Vercel serverless function: sends a quote email via Resend.
// The Resend API key is read from an environment variable (RESEND_API_KEY),
// which you set in the Vercel dashboard — it is never in this file or the app.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email is not configured on the server.' });
  }

  // Pull the pieces the app sends us
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { to, subject, text, replyTo } = body || {};

  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing to, subject, or message.' });
  }

  // Basic sanity check on the recipient address
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to))) {
    return res.status(400).json({ error: 'That recipient email does not look valid.' });
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Change this "from" address if you want a different sender label.
        from: 'Tree Hombres <quotes@treehombres.com>',
        to: [to],
        subject: subject,
        text: text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      return res.status(resendRes.status).json({
        error: (data && data.message) || 'Resend rejected the request.',
      });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: 'Could not reach the email service.' });
  }
}
