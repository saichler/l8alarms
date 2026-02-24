package escalationpolicies

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "EscPolicy"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.EscalationPolicy, alm.EscalationPolicyList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "PolicyId", Callback: newEscalationPolicyServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func EscalationPolicies(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func EscalationPolicy(id string, vnic ifs.IVNic) (*alm.EscalationPolicy, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.EscalationPolicy{PolicyId: id}, vnic)
}
