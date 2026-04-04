package ui

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
)

func RegisterAlmTypes(resources ifs.IResources) {
	// Core alarm management
	common.RegisterType(resources, &alm.AlarmDefinition{}, &alm.AlarmDefinitionList{}, "DefinitionId")
	common.RegisterType(resources, &alm.Alarm{}, &alm.AlarmList{}, "AlarmId")
	common.RegisterType(resources, &alm.Event{}, &alm.EventList{}, "EventId")

	// Correlation
	common.RegisterType(resources, &alm.CorrelationRule{}, &alm.CorrelationRuleList{}, "RuleId")

	// Policies
	common.RegisterType(resources, &alm.NotificationPolicy{}, &alm.NotificationPolicyList{}, "PolicyId")
	common.RegisterType(resources, &alm.EscalationPolicy{}, &alm.EscalationPolicyList{}, "PolicyId")

	// Operations
	common.RegisterType(resources, &alm.MaintenanceWindow{}, &alm.MaintenanceWindowList{}, "WindowId")
	common.RegisterType(resources, &alm.AlarmFilter{}, &alm.AlarmFilterList{}, "FilterId")

	// Archive
	common.RegisterType(resources, &alm.ArchivedAlarm{}, &alm.ArchivedAlarmList{}, "AlarmId")
	common.RegisterType(resources, &alm.ArchivedEvent{}, &alm.ArchivedEventList{}, "EventId")

	// External types used by EnrichmentService
	resources.Registry().Register(&l8topo.L8Topology{})
	// Multi-pk: use direct decorator call since l8common's RegisterType takes single pkField
	resources.Introspector().Decorators().AddPrimaryKeyDecorator(&l8topo.L8TopologyMetadata{}, "ServiceName", "ServiceArea")
	resources.Registry().Register(&l8topo.L8TopologyMetadataList{})
}
