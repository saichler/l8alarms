package alarmfilters

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmFilterServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.AlarmFilter{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.AlarmFilter).FilterId }, "FilterId").
		Require(func(e interface{}) string { return e.(*alm.AlarmFilter).Name }, "Name").
		Require(func(e interface{}) string { return e.(*alm.AlarmFilter).Owner }, "Owner").
		Build()
}
