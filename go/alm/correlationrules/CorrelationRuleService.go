package correlationrules

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "CorrRule"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.CorrelationRule, alm.CorrelationRuleList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "RuleId", Callback: newCorrelationRuleServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func CorrelationRules(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func CorrelationRule(id string, vnic ifs.IVNic) (*alm.CorrelationRule, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.CorrelationRule{RuleId: id}, vnic)
}
