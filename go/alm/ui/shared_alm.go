package ui

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func RegisterAlmTypes(resources ifs.IResources) {
	// Core alarm management
	common.RegisterType[alm.AlarmDefinition, alm.AlarmDefinitionList](resources, "DefinitionId")
	common.RegisterType[alm.Alarm, alm.AlarmList](resources, "AlarmId")
	common.RegisterType[alm.Event, alm.EventList](resources, "EventId")

	// Correlation
	common.RegisterType[alm.CorrelationRule, alm.CorrelationRuleList](resources, "RuleId")

	// Policies
	common.RegisterType[alm.NotificationPolicy, alm.NotificationPolicyList](resources, "PolicyId")
	common.RegisterType[alm.EscalationPolicy, alm.EscalationPolicyList](resources, "PolicyId")

	// Operations
	common.RegisterType[alm.MaintenanceWindow, alm.MaintenanceWindowList](resources, "WindowId")
	common.RegisterType[alm.AlarmFilter, alm.AlarmFilterList](resources, "FilterId")
}
