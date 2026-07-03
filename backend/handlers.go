package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// ── Request / response types ──────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Contact  string `json:"contact"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type verifyRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type resendRequest struct {
	Email string `json:"email"`
}

type userResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Contact  string `json:"contact"`
}

type authResponse struct {
	User            userResponse `json:"user"`
	SessionReplaced bool         `json:"session_replaced"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// ── Helpers ───────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

// ── POST /api/v1/user/register ────────────────────────────────────────

func handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req registerRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	// Validation
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = strings.TrimSpace(req.Username)
	req.Contact = strings.TrimSpace(req.Contact)

	if req.Email == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Email is required."})
		return
	}
	if req.Username == "" || len(req.Username) < 3 {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Username must be at least 3 characters."})
		return
	}
	if req.Contact == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Contact number is required."})
		return
	}
	if len(req.Password) < 8 {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Password must be at least 8 characters."})
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bcrypt error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Generate verification code
	code, err := generateVerificationCode()
	if err != nil {
		log.Printf("code generation error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}
	codeExpiry := time.Now().Add(10 * time.Minute)

	// Insert user with verification fields — NOT verified yet
	var userID string
	err = db.QueryRow(
		`INSERT INTO users (email, username, contact, password_hash, verified, verification_code, verification_expires_at)
		 VALUES ($1, $2, $3, $4, FALSE, $5, $6) RETURNING id`,
		req.Email, req.Username, req.Contact, string(hash), code, codeExpiry,
	).Scan(&userID)

	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			if strings.Contains(err.Error(), "email") {
				writeJSON(w, http.StatusConflict, errorResponse{Error: "An account with this email already exists."})
			} else if strings.Contains(err.Error(), "username") {
				writeJSON(w, http.StatusConflict, errorResponse{Error: "This username is already taken."})
			} else {
				writeJSON(w, http.StatusConflict, errorResponse{Error: "Account already exists."})
			}
			return
		}
		log.Printf("insert user error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Send verification email
	if err := sendVerificationEmail(req.Email, req.Username, code); err != nil {
		log.Printf("⚠ Failed to send verification email to %s: %v", req.Email, err)
		// Don't fail registration — user can resend
	}

	// DO NOT create a session — user must verify email first
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"needs_verification": true,
		"email":              req.Email,
		"message":            "Verification code sent to your email.",
	})

	log.Printf("✓ User registered (unverified): %s (%s) — code sent", req.Username, req.Email)
}

// ── POST /api/v1/user/verify-email ────────────────────────────────────

func handleVerifyEmail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req verifyRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Code = strings.TrimSpace(req.Code)

	if req.Email == "" || req.Code == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Email and verification code are required."})
		return
	}

	// Look up the user
	var userID, username, contact, storedCode string
	var codeExpiry time.Time
	var verified bool

	err := db.QueryRow(
		`SELECT id, username, contact, verification_code, verification_expires_at, verified
		 FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &username, &contact, &storedCode, &codeExpiry, &verified)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "No account found with this email."})
		return
	}
	if err != nil {
		log.Printf("verify lookup error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Already verified?
	if verified {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Email is already verified. Please sign in."})
		return
	}

	// Check code expiry
	if time.Now().After(codeExpiry) {
		writeJSON(w, http.StatusGone, errorResponse{Error: "Verification code has expired. Please request a new one."})
		return
	}

	// Check code match
	if storedCode != req.Code {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "Invalid verification code."})
		return
	}

	// Mark user as verified and clear the code
	_, err = db.Exec(
		`UPDATE users SET verified = TRUE, verification_code = NULL, verification_expires_at = NULL WHERE id = $1`,
		userID,
	)
	if err != nil {
		log.Printf("verify update error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Create session — user is now verified and logged in
	deviceInfo := r.UserAgent()
	token, _, err := createSession(userID, deviceInfo)
	if err != nil {
		log.Printf("create session error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	setSessionCookie(w, token)

	writeJSON(w, http.StatusOK, authResponse{
		User: userResponse{
			ID:       userID,
			Email:    req.Email,
			Username: username,
			Contact:  contact,
		},
	})

	log.Printf("✓ Email verified: %s (%s)", username, req.Email)
}

// ── POST /api/v1/user/resend-code ─────────────────────────────────────

func handleResendCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req resendRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Email is required."})
		return
	}

	// Look up user
	var userID, username string
	var verified bool

	err := db.QueryRow(
		`SELECT id, username, verified FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &username, &verified)

	if err == sql.ErrNoRows {
		// Don't reveal whether account exists — return success anyway
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"message": "If an account exists with this email, a new code has been sent.",
		})
		return
	}
	if err != nil {
		log.Printf("resend lookup error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	if verified {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Email is already verified."})
		return
	}

	// Generate new code
	code, err := generateVerificationCode()
	if err != nil {
		log.Printf("code generation error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}
	codeExpiry := time.Now().Add(10 * time.Minute)

	// Update code in DB
	_, err = db.Exec(
		`UPDATE users SET verification_code = $1, verification_expires_at = $2 WHERE id = $3`,
		code, codeExpiry, userID,
	)
	if err != nil {
		log.Printf("update code error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Send email
	if err := sendVerificationEmail(req.Email, username, code); err != nil {
		log.Printf("⚠ Failed to resend verification email to %s: %v", req.Email, err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Failed to send email. Please try again."})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "A new verification code has been sent to your email.",
	})

	log.Printf("📧 Resent verification code to %s (%s)", username, req.Email)
}

// ── POST /api/v1/user/login ───────────────────────────────────────────

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var req loginRequest
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Email and password are required."})
		return
	}

	// Find user
	var userID, email, username, contact, passwordHash string
	var verified bool
	err := db.QueryRow(
		`SELECT id, email, username, contact, password_hash, verified FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &email, &username, &contact, &passwordHash, &verified)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "Invalid email or password."})
		return
	}
	if err != nil {
		log.Printf("login query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "Invalid email or password."})
		return
	}

	// Block unverified users
	if !verified {
		writeJSON(w, http.StatusForbidden, map[string]interface{}{
			"error":              "Please verify your email first.",
			"needs_verification": true,
			"email":              email,
		})
		return
	}

	// Create session — this deletes any existing session (single-device enforcement)
	deviceInfo := r.UserAgent()
	token, replaced, err := createSession(userID, deviceInfo)
	if err != nil {
		log.Printf("create session error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	setSessionCookie(w, token)

	writeJSON(w, http.StatusOK, authResponse{
		User: userResponse{
			ID:       userID,
			Email:    email,
			Username: username,
			Contact:  contact,
		},
		SessionReplaced: replaced,
	})

	if replaced {
		log.Printf("⚠ Session replaced for user %s (logged in from new device)", username)
	} else {
		log.Printf("✓ User logged in: %s", username)
	}
}

// ── GET /api/v1/user/me ───────────────────────────────────────────────

func handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	token := getSessionToken(r)
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "not_authenticated"})
		return
	}

	userID, err := lookupSession(token)
	if err == sql.ErrNoRows {
		// Session not found — either expired or replaced by another device
		clearSessionCookie(w)
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "session_replaced"})
		return
	}
	if err != nil {
		log.Printf("session lookup error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	// Fetch user details
	var email, username, contact string
	err = db.QueryRow(
		`SELECT email, username, contact FROM users WHERE id = $1`, userID,
	).Scan(&email, &username, &contact)

	if err != nil {
		log.Printf("user lookup error: %v", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Server error."})
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		User: userResponse{
			ID:       userID,
			Email:    email,
			Username: username,
			Contact:  contact,
		},
	})
}

// ── POST /api/v1/user/logout ──────────────────────────────────────────

func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	token := getSessionToken(r)
	if token != "" {
		if err := deleteSession(token); err != nil {
			log.Printf("delete session error: %v", err)
		}
	}

	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
