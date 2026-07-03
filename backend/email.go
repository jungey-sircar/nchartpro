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

// getEmailConfig reads SMTP config from environment variables.
func getEmailConfig() EmailConfig {
	return EmailConfig{
		Host:     envOrDefault("SMTP_HOST", "smtp.gmail.com"),
		Port:     envOrDefault("SMTP_PORT", "587"),
		User:     envOrDefault("SMTP_USER", ""),
		Password: envOrDefault("SMTP_PASSWORD", ""),
		From:     envOrDefault("SMTP_FROM", ""),
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

// sendVerificationEmail sends the 6-digit code to the user's email.
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
	body := fmt.Sprintf(`Hi %s,

Welcome to NChartPro! Your verification code is:

    %s

This code expires in 10 minutes. Enter it in the app to complete your registration.

If you didn't create an account, please ignore this email.

— The NChartPro Team`, username, code)

	// Build RFC 822 message
	msg := strings.Join([]string{
		"From: NChartPro <" + from + ">",
		"To: " + toEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=\"utf-8\"",
		"",
		body,
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
		"Content-Type: text/plain; charset=\"utf-8\"",
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

