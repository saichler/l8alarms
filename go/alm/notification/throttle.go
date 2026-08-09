package notification

import (
	"sync"
	"time"
)

// throttler enforces a per-key cooldown and a per-group hourly cap so the
// engine doesn't send repeat notifications for the same alarm+policy. This
// is a local decision about whether to call the Notify service at all — it
// never talks to l8notify itself.
type throttler struct {
	lastSent    map[string]int64
	hourlyCount map[string]*hourCounter
	mtx         sync.Mutex
}

type hourCounter struct {
	hour  int
	count int32
}

func newThrottler() *throttler {
	return &throttler{
		lastSent:    make(map[string]int64),
		hourlyCount: make(map[string]*hourCounter),
	}
}

// isThrottled returns true if the key should be suppressed.
// cooldownSec: minimum seconds between sends for this key.
// maxPerHour: maximum sends per hour for this groupKey (0 = unlimited).
func (t *throttler) isThrottled(key, groupKey string, cooldownSec, maxPerHour int32) bool {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	now := time.Now()
	if cooldownSec > 0 {
		if lastSent, ok := t.lastSent[key]; ok && now.Unix()-lastSent < int64(cooldownSec) {
			return true
		}
	}
	if maxPerHour > 0 {
		hc, ok := t.hourlyCount[groupKey]
		if !ok {
			hc = &hourCounter{hour: now.Hour()}
			t.hourlyCount[groupKey] = hc
		}
		if hc.hour != now.Hour() {
			hc.hour = now.Hour()
			hc.count = 0
		}
		if hc.count >= maxPerHour {
			return true
		}
	}
	return false
}

// record marks a send for the given key and groupKey.
func (t *throttler) record(key, groupKey string) {
	t.mtx.Lock()
	defer t.mtx.Unlock()

	now := time.Now()
	t.lastSent[key] = now.Unix()

	hc, ok := t.hourlyCount[groupKey]
	if !ok {
		hc = &hourCounter{hour: now.Hour()}
		t.hourlyCount[groupKey] = hc
	}
	if hc.hour != now.Hour() {
		hc.hour = now.Hour()
		hc.count = 0
	}
	hc.count++
}
