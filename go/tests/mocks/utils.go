package mocks

import (
	"fmt"
	"math/rand"
	"time"
)

// pickRef safely picks a reference ID by modulo index, returns "" if slice empty.
func pickRef(ids []string, index int) string {
	if len(ids) == 0 {
		return ""
	}
	return ids[index%len(ids)]
}

// randomPastDate returns Unix timestamp randomly in the past.
func randomPastDate(maxMonths, maxDays int) int64 {
	return time.Now().AddDate(0, -rand.Intn(maxMonths), -rand.Intn(maxDays)).Unix()
}

// randomFutureDate returns Unix timestamp randomly in the future.
func randomFutureDate(maxMonths, maxDays int) int64 {
	return time.Now().AddDate(0, rand.Intn(maxMonths), rand.Intn(maxDays)).Unix()
}

// genID creates an ID like "prefix-001".
func genID(prefix string, index int) string {
	return fmt.Sprintf("%s-%03d", prefix, index+1)
}

// nowUnix returns the current Unix timestamp.
func nowUnix() int64 {
	return time.Now().Unix()
}

// pick returns a random element from a string slice.
func pick(items []string) string {
	return items[rand.Intn(len(items))]
}

// pickInt returns a random int from an int slice.
func pickInt(items []int32) int32 {
	return items[rand.Intn(len(items))]
}
