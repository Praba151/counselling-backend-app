async function sendEmail({ toEmail, toName, subject, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Counseling App', email: process.env.EMAIL_USER },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errText}`);
  }
}

module.exports = { sendEmail };