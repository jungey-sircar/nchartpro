package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	// Initialize database
	if err := InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Register routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/user/register", handleRegister)
	mux.HandleFunc("/api/v1/user/login", handleLogin)
	mux.HandleFunc("/api/v1/user/verify-email", handleVerifyEmail)
	mux.HandleFunc("/api/v1/user/resend-code", handleResendCode)
	mux.HandleFunc("/api/v1/user/me", handleMe)
	mux.HandleFunc("/api/v1/user/logout", handleLogout)

	// Health check
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// CORS middleware for development
	handler := corsMiddleware(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 NChartPro API server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// corsMiddleware adds CORS headers for local development.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
