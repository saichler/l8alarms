package enrichment

import (
	"github.com/saichler/l8alarms/go/alm/alarms"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8utils/go/utils/web"
)

const (
	ServiceName = "AlmOverlay"
	ServiceArea = byte(10)
)

// EnrichmentService provides alarm-enriched topology data.
// It is a read-only service that fetches topology from l8topology,
// overlays alarm data, and returns the enriched topology.
type EnrichmentService struct {
	serviceName string
	serviceArea byte
}

func Activate(vnic ifs.IVNic) {
	svc := &EnrichmentService{}
	sla := ifs.NewServiceLevelAgreement(svc, ServiceName, ServiceArea, true, nil)
	sla.SetServiceItem(&l8topo.L8Topology{})
	sla.SetServiceItemList(&l8topo.L8TopologyMetadataList{})

	ws := web.New(ServiceName, ServiceArea, 0)
	ws.AddEndpoint(&l8topo.L8TopologyMetadata{}, ifs.GET, &l8topo.L8Topology{})
	sla.SetWebService(ws)

	vnic.Resources().Services().Activate(sla, vnic)
}

func (s *EnrichmentService) Activate(sla *ifs.ServiceLevelAgreement, vnic ifs.IVNic) error {
	s.serviceName = sla.ServiceName()
	s.serviceArea = sla.ServiceArea()
	return nil
}

func (s *EnrichmentService) DeActivate() error { return nil }

// Get accepts L8TopologyMetadata (serviceName + serviceArea) as a query,
// fetches the corresponding topology, enriches it with alarm overlay, and returns it.
func (s *EnrichmentService) Get(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	// Extract the topology metadata from the request
	md, ok := elements.Element().(*l8topo.L8TopologyMetadata)
	if !ok || md == nil {
		return object.NewError("invalid request: expected L8TopologyMetadata")
	}

	// Fetch the topology from the specified topology service
	topoHandler, ok := vnic.Resources().Services().ServiceHandler(md.ServiceName, byte(md.ServiceArea))
	if !ok {
		return object.NewError("topology service not found: " + md.ServiceName)
	}

	query := &l8topo.L8TopologyQuery{}
	resp := topoHandler.Get(object.New(nil, query), vnic)
	if resp == nil || resp.Error() != nil {
		if resp != nil {
			return resp
		}
		return object.NewError("failed to fetch topology")
	}

	topo, ok := resp.Element().(*l8topo.L8Topology)
	if !ok || topo == nil {
		return object.NewError("no topology data returned")
	}

	// Fetch active alarms
	activeAlarms, err := common.GetEntities(
		alarms.ServiceName, alarms.ServiceArea,
		&alm.Alarm{State: alm.AlarmState_ALARM_STATE_ACTIVE},
		vnic,
	)
	if err != nil {
		return object.NewError("failed to fetch active alarms: " + err.Error())
	}

	// Enrich the topology with alarm overlay data
	EnrichTopology(topo, activeAlarms)

	return object.New(nil, topo)
}

func (s *EnrichmentService) Post(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return object.NewError("enrichment service is read-only")
}

func (s *EnrichmentService) Put(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return object.NewError("enrichment service is read-only")
}

func (s *EnrichmentService) Patch(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return object.NewError("enrichment service is read-only")
}

func (s *EnrichmentService) Delete(elements ifs.IElements, vnic ifs.IVNic) ifs.IElements {
	return object.NewError("enrichment service is read-only")
}

func (s *EnrichmentService) Failed(elements ifs.IElements, vnic ifs.IVNic, msg *ifs.Message) ifs.IElements {
	return nil
}

func (s *EnrichmentService) TransactionConfig() ifs.ITransactionConfig {
	return nil
}

func (s *EnrichmentService) WebService() ifs.IWebService {
	ws := web.New(s.serviceName, s.serviceArea, 0)
	ws.AddEndpoint(&l8topo.L8TopologyMetadata{}, ifs.GET, &l8topo.L8Topology{})
	return ws
}
