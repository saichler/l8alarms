package alarmfilters

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmFilterServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.AlarmFilter]("AlarmFilter",
		func(e *alm.AlarmFilter) { common.GenerateID(&e.FilterId) }).
		Require(func(e *alm.AlarmFilter) string { return e.FilterId }, "FilterId").
		Require(func(e *alm.AlarmFilter) string { return e.Name }, "Name").
		Require(func(e *alm.AlarmFilter) string { return e.Owner }, "Owner").
		Build()
}
