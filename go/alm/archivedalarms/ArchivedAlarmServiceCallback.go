package archivedalarms

import (
	"errors"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func rejectPut(_ *alm.ArchivedAlarm, action ifs.Action, _ ifs.IVNic) error {
	if action == ifs.PUT {
		return errors.New("Archived alarms are immutable and cannot be updated")
	}
	return nil
}

func newArchivedAlarmServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.ArchivedAlarm]("ArchivedAlarm",
		func(e *alm.ArchivedAlarm) {}).
		BeforeAction(rejectPut).
		Require(func(e *alm.ArchivedAlarm) string { return e.AlarmId }, "AlarmId").
		Build()
}
