package mocks

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
	"time"
)

// RunMockGenerator runs the mock data generator with the given parameters.
func RunMockGenerator(address, user, password string, insecure bool) {
	fmt.Printf("ALM Mock Data Generator\n")
	fmt.Printf("=======================\n")
	fmt.Printf("Server: %s\n", address)
	fmt.Printf("User: %s\n", user)
	if insecure {
		fmt.Printf("TLS: Insecure (certificate verification disabled)\n")
	}
	fmt.Printf("\n")

	httpClient := &http.Client{Timeout: 30 * time.Second}
	if insecure {
		httpClient.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	client := NewClient(address, httpClient)

	// Authenticate
	err := client.Authenticate(user, password)
	if err != nil {
		fmt.Printf("Authentication failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Authentication successful\n\n")

	// Initialize data store
	store := &MockDataStore{}

	// Generate and insert mock data in dependency order
	RunAllPhases(client, store)

	// Print summary
	PrintSummary(store)
}
