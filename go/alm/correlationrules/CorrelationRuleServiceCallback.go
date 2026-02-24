package correlationrules

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newCorrelationRuleServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.CorrelationRule]("CorrelationRule",
		func(e *alm.CorrelationRule) { common.GenerateID(&e.RuleId) }).
		Require(func(e *alm.CorrelationRule) string { return e.RuleId }, "RuleId").
		Require(func(e *alm.CorrelationRule) string { return e.Name }, "Name").
		Enum(func(e *alm.CorrelationRule) int32 { return int32(e.RuleType) }, alm.CorrelationRuleType_name, "RuleType").
		Enum(func(e *alm.CorrelationRule) int32 { return int32(e.Status) }, alm.CorrelationRuleStatus_name, "Status").
		Build()
}
