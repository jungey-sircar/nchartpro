package main

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"
)

const (
	cookieName     = "session_token"
	sessionMaxAge  = 7 * 24 * time.Hour // 7 days
	cookiePath     = "/"
)

// generateToken creates a cryptographically secure random hex token (32 bytes = 64 hex chars).
func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// createSession deletes any existing session for the user (single-device enforcement)
// and inserts a new one. Returns the token and whether an old session was replaced.
func createSession(userID, deviceInfo string) (token string, replaced bool, err error) {
	// Check if there's an existing session
	var oldToken string
	err = db.QueryRow("SELECT token FROM sessions WHERE user_id = $1", userID).Scan(&oldToken)
	replaced = err == nil // if we found a row, a session is being replaced

	// Delete any existing session for this user
	_, _ = db.Exec("DELETE FROM sessions WHERE user_id = $1", userID)

	// Generate new token
	token, err = generateToken()
	if err != nil {
		return "", replaced, err
	}

	expiresAt := time.Now().Add(sessionMaxAge)

	_, err = db.Exec(
		`INSERT INTO sessions (user_id, token, device_info, expires_at)
		 VALUES ($1, $2, $3, $4)`,
		userID, token, deviceInfo, expiresAt,
	)
	if err != nil {
		return "", replaced, err
	}

	return token, replaced, nil
}

// lookupSession finds a session by token and returns the user_id.
// Returns sql.ErrNoRows if not found or expired.
func lookupSession(token string) (string, error) {
	var userID string
	err := db.QueryRow(
		`SELECT user_id FROM sessions
		 WHERE token = $1 AND expires_at > NOW()`,
		token,
	).Scan(&userID)
	return userID, err
}

// deleteSession removes a session by token.
func deleteSession(token string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE token = $1", token)
	return err
}

// setSessionCookie writes the session token into an HTTP-only cookie.
func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     cookiePath,
		MaxAge:   int(sessionMaxAge.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // set true in production with HTTPS
	})
}

// clearSessionCookie expires the session cookie.
func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     cookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

// getSessionToken reads the session token from the request cookie.
func getSessionToken(r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}
