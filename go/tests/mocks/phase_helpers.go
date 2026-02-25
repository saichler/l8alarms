package mocks

import (
	"fmt"
	"os"
	"strings"
)

// runOp executes a single phase operation: post + store IDs.
func runOp(client *Client, label, endpoint string, list interface{}, ids []string, storeIDs *[]string) error {
	fmt.Printf("  Creating %s...", label)
	resp, err := client.Post(endpoint, list)
	if err != nil {
		fmt.Printf(" FAILED\n")
		fmt.Printf("    Error: %v\n", err)
		if resp != "" {
			fmt.Printf("    Response: %s\n", resp)
		}
		return fmt.Errorf("%s: %w", label, err)
	}
	if storeIDs != nil && ids != nil {
		*storeIDs = append(*storeIDs, ids...)
	}
	fmt.Printf(" %d created\n", len(ids))
	return nil
}

// extractIDs extracts a string field from a slice using a getter.
func extractIDs[T any](items []*T, getter func(*T) string) []string {
	ids := make([]string, len(items))
	for i, item := range items {
		ids[i] = getter(item)
	}
	return ids
}

// runPhase runs a phase function with header formatting.
func runPhase(label string, fn func() error) {
	fmt.Printf("\n%s\n", label)
	fmt.Printf("%s\n", strings.Repeat("-", len(label)))
	if err := fn(); err != nil {
		fmt.Printf("%s failed: %v\n", label, err)
		os.Exit(1)
	}
}
