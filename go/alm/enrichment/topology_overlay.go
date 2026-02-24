package enrichment

import (
	"github.com/saichler/l8alarms/go/types/alm"
)

// NodeOverlay represents alarm overlay data for a topology node.
type NodeOverlay struct {
	NodeId          string
	AlarmCount      int32
	HighestSeverity alm.AlarmSeverity
	ActiveAlarms    []*alm.Alarm
}

// LinkOverlay represents alarm overlay data for a topology link.
type LinkOverlay struct {
	LinkId          string
	AlarmCount      int32
	HighestSeverity alm.AlarmSeverity
}

// ComputeNodeOverlays computes alarm overlay data for each topology node.
func ComputeNodeOverlays(activeAlarms []*alm.Alarm) map[string]*NodeOverlay {
	overlays := make(map[string]*NodeOverlay)

	for _, a := range activeAlarms {
		if a.NodeId == "" {
			continue
		}
		if a.State == alm.AlarmState_ALARM_STATE_CLEARED || a.State == alm.AlarmState_ALARM_STATE_SUPPRESSED {
			continue
		}

		overlay, ok := overlays[a.NodeId]
		if !ok {
			overlay = &NodeOverlay{NodeId: a.NodeId}
			overlays[a.NodeId] = overlay
		}
		overlay.AlarmCount++
		overlay.ActiveAlarms = append(overlay.ActiveAlarms, a)
		if a.Severity > overlay.HighestSeverity {
			overlay.HighestSeverity = a.Severity
		}
	}

	return overlays
}

// ComputeLinkOverlays computes alarm overlay data for each topology link.
func ComputeLinkOverlays(activeAlarms []*alm.Alarm) map[string]*LinkOverlay {
	overlays := make(map[string]*LinkOverlay)

	for _, a := range activeAlarms {
		if a.LinkId == "" {
			continue
		}
		if a.State == alm.AlarmState_ALARM_STATE_CLEARED || a.State == alm.AlarmState_ALARM_STATE_SUPPRESSED {
			continue
		}

		overlay, ok := overlays[a.LinkId]
		if !ok {
			overlay = &LinkOverlay{LinkId: a.LinkId}
			overlays[a.LinkId] = overlay
		}
		overlay.AlarmCount++
		if a.Severity > overlay.HighestSeverity {
			overlay.HighestSeverity = a.Severity
		}
	}

	return overlays
}
