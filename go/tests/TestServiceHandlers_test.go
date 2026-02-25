package tests

import (
	"github.com/saichler/l8alarms/go/alm/alarmdefinitions"
	"github.com/saichler/l8alarms/go/alm/alarmfilters"
	"github.com/saichler/l8alarms/go/alm/alarms"
	"github.com/saichler/l8alarms/go/alm/correlationrules"
	"github.com/saichler/l8alarms/go/alm/escalationpolicies"
	"github.com/saichler/l8alarms/go/alm/events"
	"github.com/saichler/l8alarms/go/alm/maintenancewindows"
	"github.com/saichler/l8alarms/go/alm/notificationpolicies"
	"github.com/saichler/l8types/go/ifs"
	"testing"
)

func testServiceHandlers(t *testing.T, vnic ifs.IVNic) {
	log := vnic.Resources().Logger()

	if h, ok := alarmdefinitions.AlarmDefinitions(vnic); !ok || h == nil {
		log.Fail(t, "AlarmDefinition service handler not found")
	}
	if h, ok := alarms.Alarms(vnic); !ok || h == nil {
		log.Fail(t, "Alarm service handler not found")
	}
	if h, ok := events.Events(vnic); !ok || h == nil {
		log.Fail(t, "Event service handler not found")
	}
	if h, ok := correlationrules.CorrelationRules(vnic); !ok || h == nil {
		log.Fail(t, "CorrelationRule service handler not found")
	}
	if h, ok := notificationpolicies.NotificationPolicies(vnic); !ok || h == nil {
		log.Fail(t, "NotificationPolicy service handler not found")
	}
	if h, ok := escalationpolicies.EscalationPolicies(vnic); !ok || h == nil {
		log.Fail(t, "EscalationPolicy service handler not found")
	}
	if h, ok := maintenancewindows.MaintenanceWindows(vnic); !ok || h == nil {
		log.Fail(t, "MaintenanceWindow service handler not found")
	}
	if h, ok := alarmfilters.AlarmFilters(vnic); !ok || h == nil {
		log.Fail(t, "AlarmFilter service handler not found")
	}
}
