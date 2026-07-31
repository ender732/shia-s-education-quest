/** Server-only email helpers. Load from *.functions.ts handlers only. */

export type SendEmailResult =
  | { status: "sent"; id?: string }
  | { status: "not_configured" }
  | { status: "failed"; message: string };

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "Shia's Quest <onboarding@resend.dev>"
  );
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping send. Subject:",
      input.subject,
      "To:",
      input.to,
    );
    return { status: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
      return { status: "failed", message: `Resend ${res.status}` };
    }

    const json = (await res.json()) as { id?: string };
    return { status: "sent", id: json.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    console.error("[email]", message);
    return { status: "failed", message };
  }
}

export function parentLinkCodeEmailContent(input: {
  linkCode: string;
  studentName: string;
}) {
  const subject = `${input.studentName}'s parent link code — Shia's 5th Grade Quest`;
  const text = [
    `Hi,`,
    ``,
    `${input.studentName} joined Shia's 5th Grade Quest and shared this parent link code with you:`,
    ``,
    input.linkCode,
    ``,
    `How to use it:`,
    `1. Create a parent account (you'll confirm you are 18+).`,
    `2. Open Parent Portal → Link a student.`,
    `3. Paste this code to follow their progress.`,
    ``,
    `— Shia's 5th Grade Quest`,
  ].join("\n");

  const html = `
    <p>Hi,</p>
    <p><strong>${escapeHtml(input.studentName)}</strong> joined Shia's 5th Grade Quest and shared this parent link code with you:</p>
    <p style="font-family:monospace;font-size:16px;font-weight:700;letter-spacing:0.02em">${escapeHtml(input.linkCode)}</p>
    <p><strong>How to use it:</strong></p>
    <ol>
      <li>Create a parent account (you'll confirm you are 18+).</li>
      <li>Open Parent Portal → Link a student.</li>
      <li>Paste this code to follow their progress.</li>
    </ol>
    <p>— Shia's 5th Grade Quest</p>
  `;

  return { subject, text, html };
}

export function parentWelcomeEmailContent() {
  const subject = `Welcome, parent — Shia's 5th Grade Quest`;
  const text = [
    `Welcome to Shia's 5th Grade Quest.`,
    ``,
    `Your parent account is ready. To follow a child's progress, ask them for their parent link code`,
    `(or check the email they sent when they signed up), then open Parent Portal → Link a student.`,
    ``,
    `— Shia's 5th Grade Quest`,
  ].join("\n");
  const html = `
    <p>Welcome to Shia's 5th Grade Quest.</p>
    <p>Your parent account is ready. To follow a child's progress, ask them for their <strong>parent link code</strong>
    (or check the email they sent when they signed up), then open <strong>Parent Portal → Link a student</strong>.</p>
    <p>— Shia's 5th Grade Quest</p>
  `;
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
