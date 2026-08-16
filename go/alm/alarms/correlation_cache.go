package alarms

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"sync"
)

// correlationEligible holds alarms currently OPEN_FOR_CORRELATION — the only
// alarms allowed to gain new symptoms. Added on the PENDING_THRESHOLD ->
// OPEN_FOR_CORRELATION transition (or immediately, on create, when a
// definition has no meaningful threshold). Evicted on OPEN_FOR_CORRELATION
// -> STABLE (correlation-window timer fires) or on CLEAR.
//
// Process-local, in-memory only. If l8alarms ever runs with more than one
// replica, each replica's cache diverges independently — this plan does not
// verify l8alarms's replication topology; flagged, not solved, here.
var (
	correlationEligible    = make(map[string]*alm.Alarm)
	correlationEligibleMtx sync.RWMutex
)

// addCorrelationEligible registers alarm as a valid root-cause candidate.
func addCorrelationEligible(alarm *alm.Alarm) {
	correlationEligibleMtx.Lock()
	defer correlationEligibleMtx.Unlock()
	correlationEligible[alarm.AlarmId] = alarm
}

// evictCorrelationEligible removes alarmId from the candidate pool.
func evictCorrelationEligible(alarmId string) {
	correlationEligibleMtx.Lock()
	defer correlationEligibleMtx.Unlock()
	delete(correlationEligible, alarmId)
}

// correlationEligibleSnapshot returns a point-in-time copy of the current
// root-cause candidate pool, safe to hand to the correlation engine.
func correlationEligibleSnapshot() []*alm.Alarm {
	correlationEligibleMtx.RLock()
	defer correlationEligibleMtx.RUnlock()
	out := make([]*alm.Alarm, 0, len(correlationEligible))
	for _, a := range correlationEligible {
		out = append(out, a)
	}
	return out
}
