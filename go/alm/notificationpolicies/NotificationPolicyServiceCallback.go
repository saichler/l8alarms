package notificationpolicies

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newNotificationPolicyServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.NotificationPolicy]("NotificationPolicy",
		func(e *alm.NotificationPolicy) { common.GenerateID(&e.PolicyId) }).
		Require(func(e *alm.NotificationPolicy) string { return e.PolicyId }, "PolicyId").
		Require(func(e *alm.NotificationPolicy) string { return e.Name }, "Name").
		Enum(func(e *alm.NotificationPolicy) int32 { return int32(e.Status) }, alm.PolicyStatus_name, "Status").
		Build()
}
