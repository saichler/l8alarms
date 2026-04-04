package escalationpolicies

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "EscPolicy"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "PolicyId", Callback: newEscalationPolicyServiceCallback(vnic),
	}, &alm.EscalationPolicy{}, &alm.EscalationPolicyList{}, creds, dbname, vnic)
}

func EscalationPolicies(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func EscalationPolicy(id string, vnic ifs.IVNic) (*alm.EscalationPolicy, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.EscalationPolicy{PolicyId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.EscalationPolicy), nil
}
