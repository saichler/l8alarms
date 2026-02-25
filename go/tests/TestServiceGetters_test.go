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

func testServiceGetters(t *testing.T, vnic ifs.IVNic) {
	log := vnic.Resources().Logger()

	if _, err := alarmdefinitions.AlarmDefinition("test-id", vnic); err != nil {
		log.Fail(t, "AlarmDefinition getter failed: ", err.Error())
	}
	if _, err := alarms.GetAlarm("test-id", vnic); err != nil {
		log.Fail(t, "Alarm getter failed: ", err.Error())
	}
	if _, err := events.GetEvent("test-id", vnic); err != nil {
		log.Fail(t, "Event getter failed: ", err.Error())
	}
	if _, err := correlationrules.CorrelationRule("test-id", vnic); err != nil {
		log.Fail(t, "CorrelationRule getter failed: ", err.Error())
	}
	if _, err := notificationpolicies.NotificationPolicy("test-id", vnic); err != nil {
		log.Fail(t, "NotificationPolicy getter failed: ", err.Error())
	}
	if _, err := escalationpolicies.EscalationPolicy("test-id", vnic); err != nil {
		log.Fail(t, "EscalationPolicy getter failed: ", err.Error())
	}
	if _, err := maintenancewindows.MaintenanceWindow("test-id", vnic); err != nil {
		log.Fail(t, "MaintenanceWindow getter failed: ", err.Error())
	}
	if _, err := alarmfilters.GetAlarmFilter("test-id", vnic); err != nil {
		log.Fail(t, "AlarmFilter getter failed: ", err.Error())
	}
}
