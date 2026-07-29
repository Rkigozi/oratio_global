# Oratio Auth Email Templates

These templates are for Supabase Auth emails used by the hosted Oratio project.

Hosted project:

- Supabase project ref: `tfwgoavbbudkxthjhnrx`
- Current V1 app URL: `https://oratiotest.netlify.app`

## Password Reset

Use `password-reset-supabase-body.html` for the Supabase Auth **Reset Password** email.
`password-reset.html` is the standalone browser-preview version.

Dashboard path:

1. Open Supabase Dashboard.
2. Go to **Authentication** > **Emails** > **Templates**.
3. Select **Reset Password**.
4. Set the subject to:

```text
Reset your Oratio password
```

5. Paste the full contents of `password-reset-supabase-body.html` into the HTML/body field.
6. Save the template.
7. Request a password reset from `/reset-password` and verify the email in Gmail and iOS Mail.

## Notes

- The template intentionally uses `{{ .ConfirmationURL }}`, which is the Supabase-provided recovery link.
- It does not include the user's email address, display name, or username. Password reset emails should stay short, private, and security-focused.
- If the sender still appears as `Supabase Auth <noreply@mail.app.supabase.io>`, configure custom SMTP in Supabase Auth. The template changes the email body and subject; custom SMTP changes the sender identity and production deliverability.
- Avoid marketing copy, tracking links, or images in auth emails.
