package mocks

import (
	"crypto/tls"
	"fmt"
	"github.com/saichler/l8types/go/ifs"
	"net/http"
	"os"
	"time"
)

// RunMockGenerator runs the mock data generator against a remote server over
// plain HTTP — this is a standalone external process (see go/tests/cmd) with
// no vnic of its own, so it cannot reach Alarm's POST (see AlarmService.go:
// Alarm's POST has no HTTP route by design — only a direct in-process vnic
// call can create one). RunAllPhases is passed a nil vnic and skips Phase 3
// (Alarms) accordingly, seeding everything else as before. Only the
// in-process test harness (TestAllService_test.go), which holds a real
// ifs.IVNic, can seed Alarms.
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

	// Generate and insert mock data in dependency order. nil vnic: this is
	// an external HTTP-only process, see doc comment above.
	var noVnic ifs.IVNic
	RunAllPhases(client, store, noVnic)

	// Print summary
	PrintSummary(store)
}
