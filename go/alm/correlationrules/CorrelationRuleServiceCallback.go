package correlationrules

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

func newCorrelationRuleServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.CorrelationRule{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.CorrelationRule).RuleId }, "RuleId").
		Require(func(e interface{}) string { return e.(*alm.CorrelationRule).Name }, "Name").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.CorrelationRule).RuleType) }, alm.CorrelationRuleType_name, "RuleType").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.CorrelationRule).Status) }, alm.CorrelationRuleStatus_name, "Status").
		Build()
}
