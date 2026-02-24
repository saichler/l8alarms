package notificationpolicies

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "NotifPol"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.NotificationPolicy, alm.NotificationPolicyList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "PolicyId", Callback: newNotificationPolicyServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func NotificationPolicies(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func NotificationPolicy(id string, vnic ifs.IVNic) (*alm.NotificationPolicy, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.NotificationPolicy{PolicyId: id}, vnic)
}
