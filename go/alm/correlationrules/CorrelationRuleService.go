package correlationrules

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "CorrRule"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "RuleId", Callback: newCorrelationRuleServiceCallback(vnic),
	}, &alm.CorrelationRule{}, &alm.CorrelationRuleList{}, creds, dbname, vnic)
}

func CorrelationRules(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func CorrelationRule(id string, vnic ifs.IVNic) (*alm.CorrelationRule, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.CorrelationRule{RuleId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.CorrelationRule), nil
}
