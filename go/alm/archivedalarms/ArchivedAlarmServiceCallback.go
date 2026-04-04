package archivedalarms

import (
	"errors"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

func rejectPut(_ *alm.ArchivedAlarm, action ifs.Action, _ ifs.IVNic) error {
	if action == ifs.PUT {
		return errors.New("Archived alarms are immutable and cannot be updated")
	}
	return nil
}

func newArchivedAlarmServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.ArchivedAlarm{}, vnic).
		BeforeAction(rejectPut).
		Require(func(e interface{}) string { return e.(*alm.ArchivedAlarm).AlarmId }, "AlarmId").
		Build()
}
