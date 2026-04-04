package escalationpolicies

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

func newEscalationPolicyServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.EscalationPolicy{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.EscalationPolicy).PolicyId }, "PolicyId").
		Require(func(e interface{}) string { return e.(*alm.EscalationPolicy).Name }, "Name").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.EscalationPolicy).Status) }, alm.AlmPolicyStatus_name, "Status").
		Build()
}
