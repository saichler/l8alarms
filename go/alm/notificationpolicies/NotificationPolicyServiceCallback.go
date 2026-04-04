package notificationpolicies

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

func newNotificationPolicyServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.NotificationPolicy{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.NotificationPolicy).PolicyId }, "PolicyId").
		Require(func(e interface{}) string { return e.(*alm.NotificationPolicy).Name }, "Name").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.NotificationPolicy).Status) }, alm.AlmPolicyStatus_name, "Status").
		Build()
}
