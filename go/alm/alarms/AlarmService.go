package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8orm/go/orm/persist"
	"github.com/saichler/l8orm/go/orm/plugins/postgres"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8api"
	"github.com/saichler/l8types/go/types/l8web"
	"github.com/saichler/l8utils/go/utils/web"
)

const (
	ServiceName = "Alarm"
	ServiceArea = byte(10)
)

// Activate registers the Alarm service with a hand-built WebService rather
// than common.ActivateService, because Alarm's POST/PUT must never be
// reachable over HTTP (see AlarmServiceCallback.go and the plan this phase
// implements): POST now accepts an *l8events.EventRecord, not a caller-
// supplied *alm.Alarm — there is no externally-invokable "Create Alarm"
// interface at all. Only GET (browse), PATCH (Acknowledge/Clear/notes), and
// DELETE keep HTTP routes. POST is still reachable internally via a direct
// vnic call (common.PostEntity/vnic.Request), which never goes through
// WebService.
func Activate(creds, dbname string, vnic ifs.IVNic) {
	_, user, pass, port, err := vnic.Resources().Security().Credential(creds, dbname, vnic.Resources())
	if err != nil {
		panic("Did not find credentials " + creds + " or db " + dbname + ":" + err.Error())
	}
	db := common.OpenDBConection(dbname, user, pass, port)
	p := postgres.NewPostgres(db, vnic.Resources())

	callback := newAlarmServiceCallback(vnic)
	sla := ifs.NewServiceLevelAgreement(&persist.OrmService{}, ServiceName, ServiceArea, true, callback)
	sla.SetServiceItem(&alm.Alarm{})
	sla.SetServiceItemList(&alm.AlarmList{})
	sla.SetPrimaryKeys("AlarmId")
	sla.SetArgs(p, true)
	sla.SetTransactional(true)

	ws := web.New(ServiceName, ServiceArea, 0)
	ws.AddEndpoint(&alm.Alarm{}, ifs.PATCH, &l8web.L8Empty{})
	ws.AddEndpoint(&l8api.L8Query{}, ifs.DELETE, &l8web.L8Empty{})
	ws.AddEndpoint(&l8api.L8Query{}, ifs.GET, &alm.AlarmList{})
	sla.SetWebService(ws)

	sla.SetServiceGroup("L8SG")
	vnic.Resources().Services().Activate(sla, vnic)
}

func Alarms(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetAlarm(id string, vnic ifs.IVNic) (*alm.Alarm, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.Alarm{AlarmId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.Alarm), nil
}

// DeleteAlarm removes an alarm by ID. Used by the threshold-window timer to
// drop an alarm that never reached AlarmDefinition.threshold_count in time —
// it should never have existed as a confirmed alarm in the first place.
func DeleteAlarm(id string, vnic ifs.IVNic) error {
	handler, ok := Alarms(vnic)
	if !ok {
		return fmt.Errorf("Alarm service not available")
	}
	query := fmt.Sprintf("select * from Alarm where AlarmId=%s", id)
	elems, err := object.NewQuery(query, vnic.Resources())
	if err != nil {
		return err
	}
	resp := handler.Delete(elems, vnic)
	if resp.Error() != nil {
		return resp.Error()
	}
	return nil
}
