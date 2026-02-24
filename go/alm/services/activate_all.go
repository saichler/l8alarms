package services

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
)

func ActivateAlmServices(creds, dbname string, vnic ifs.IVNic) {
	// Core alarm management
	alarmdefinitions.Activate(creds, dbname, vnic)
	alarms.Activate(creds, dbname, vnic)
	events.Activate(creds, dbname, vnic)

	// Correlation
	correlationrules.Activate(creds, dbname, vnic)

	// Policies
	notificationpolicies.Activate(creds, dbname, vnic)
	escalationpolicies.Activate(creds, dbname, vnic)

	// Operations
	maintenancewindows.Activate(creds, dbname, vnic)
	alarmfilters.Activate(creds, dbname, vnic)
}
