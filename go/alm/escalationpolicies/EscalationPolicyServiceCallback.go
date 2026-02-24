package escalationpolicies

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newEscalationPolicyServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.EscalationPolicy]("EscalationPolicy",
		func(e *alm.EscalationPolicy) { common.GenerateID(&e.PolicyId) }).
		Require(func(e *alm.EscalationPolicy) string { return e.PolicyId }, "PolicyId").
		Require(func(e *alm.EscalationPolicy) string { return e.Name }, "Name").
		Enum(func(e *alm.EscalationPolicy) int32 { return int32(e.Status) }, alm.PolicyStatus_name, "Status").
		Build()
}
