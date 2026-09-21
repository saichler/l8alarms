package notificationpolicies

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "NotifPol"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	sla := common.NewOrmSLA(ServiceName, ServiceArea, "PolicyId", newNotificationPolicyServiceCallback(vnic),
		&alm.NotificationPolicy{}, &alm.NotificationPolicyList{})
	sla.SetServiceGroup("L8AL")
	common.ActivateService(sla, creds, dbname, vnic)
}

func NotificationPolicies(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func NotificationPolicy(id string, vnic ifs.IVNic) (*alm.NotificationPolicy, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.NotificationPolicy{PolicyId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.NotificationPolicy), nil
}
