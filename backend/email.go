package main

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"net/smtp"
	"strings"
)

// EmailConfig holds SMTP settings.
type EmailConfig struct {
	Host     string // e.g. "smtp.gmail.com"
	Port     string // e.g. "587"
	User     string // e.g. "you@gmail.com"
	Password string // App Password
	From     string // display address
}

// getEmailConfig reads SMTP config from environment variables with hardcoded defaults.
func getEmailConfig() EmailConfig {
	return EmailConfig{
		Host:     envOrDefault("SMTP_HOST", "smtp.gmail.com"),
		Port:     envOrDefault("SMTP_PORT", "587"),
		User:     envOrDefault("SMTP_USER", "voidmaneric@gmail.com"),
		Password: envOrDefault("SMTP_PASSWORD", "nszl ombm kbmk fgeo"),
		From:     envOrDefault("SMTP_FROM", "voidmaneric@gmail.com"),
	}
}

// isEmailConfigured returns true if SMTP credentials are set.
func isEmailConfigured() bool {
	cfg := getEmailConfig()
	return cfg.User != "" && cfg.Password != ""
}

// generateVerificationCode produces a 6-digit numeric code.
func generateVerificationCode() (string, error) {
	max := big.NewInt(999999)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	// Zero-pad to 6 digits
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// sendVerificationEmail sends a branded HTML verification email.
// Falls back to console logging if SMTP is not configured.
func sendVerificationEmail(toEmail, username, code string) error {
	if !isEmailConfigured() {
		log.Printf("📧 [DEV MODE] Verification code for %s (%s): %s", username, toEmail, code)
		return nil
	}

	cfg := getEmailConfig()
	from := cfg.From
	if from == "" {
		from = cfg.User
	}

	subject := "NChartPro — Verify Your Email"

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0d0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,rgba(99,102,241,0.12),rgba(20,20,30,0.95),rgba(99,102,241,0.08));border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:40px 36px;">
        <!-- Logo / Brand -->
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0;font-size:28px;font-weight:800;color:#6366f1;letter-spacing:-0.02em;">NChartPro</h1>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding-bottom:16px;">
          <p style="margin:0;font-size:16px;color:#e8e8f0;">Hi <strong>%s</strong>,</p>
        </td></tr>

        <!-- Message -->
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-size:15px;color:#b8b8cc;line-height:1.6;">
            Welcome to NChartPro! Enter the verification code below to confirm your email and activate your account.
          </p>
        </td></tr>

        <!-- Code box -->
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="display:inline-block;padding:16px 40px;background:rgba(99,102,241,0.12);border:2px solid rgba(99,102,241,0.4);border-radius:12px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#6366f1;font-family:'Courier New',monospace;">%s</span>
          </div>
        </td></tr>

        <!-- Expiry notice -->
        <tr><td style="padding-bottom:28px;">
          <p style="margin:0;font-size:13px;color:#787896;text-align:center;">
            This code expires in <strong style="color:#b8b8cc;">10 minutes</strong>.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding-bottom:20px;">
          <hr style="border:none;border-top:1px solid rgba(99,102,241,0.15);margin:0;">
        </td></tr>

        <!-- Footer -->
        <tr><td>
          <p style="margin:0;font-size:12px;color:#787896;line-height:1.5;">
            If you didn't create an account on NChartPro, you can safely ignore this email.
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#787896;">
            — The NChartPro Team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`, username, code)

	// Build RFC 822 message with HTML content type
	msg := strings.Join([]string{
		"From: NChartPro <" + from + ">",
		"To: " + toEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		`Content-Type: text/html; charset="utf-8"`,
		"",
		htmlBody,
	}, "\r\n")

	auth := smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	addr := cfg.Host + ":" + cfg.Port

	if err := smtp.SendMail(addr, auth, from, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp.SendMail: %w", err)
	}

	log.Printf("📧 Verification email sent to %s", toEmail)
	return nil
}

// sendEmail is a generic helper for future emails.
func sendEmail(to, subject, body string) error {
	if !isEmailConfigured() {
		log.Printf("📧 [DEV MODE] Email to %s — Subject: %s", to, subject)
		return nil
	}

	cfg := getEmailConfig()
	from := cfg.From
	if from == "" {
		from = cfg.User
	}

	msg := strings.Join([]string{
		"From: NChartPro <" + from + ">",
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		`Content-Type: text/plain; charset="utf-8"`,
		"",
		body,
	}, "\r\n")

	auth := smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	addr := cfg.Host + ":" + cfg.Port

	return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
}

func init() {
	if isEmailConfigured() {
		cfg := getEmailConfig()
		log.Printf("✓ SMTP configured (via %s:%s as %s)", cfg.Host, cfg.Port, cfg.User)
	} else {
		log.Println("⚠ SMTP not configured — verification codes will be logged to console")
		log.Println("  Set SMTP_USER and SMTP_PASSWORD environment variables to enable email")
	}
}
