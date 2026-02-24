package correlation

import (
	"github.com/saichler/l8topology/go/types/l8topo"
)

// BuildAdjacency constructs an adjacency map from topology links.
// Each entry maps a nodeId to its list of neighbor nodeIds.
func BuildAdjacency(topo *l8topo.L8Topology) map[string][]string {
	adj := make(map[string][]string)
	if topo == nil || topo.Links == nil {
		return adj
	}

	for _, link := range topo.Links {
		if link.Aside == "" || link.Zside == "" {
			continue
		}
		adj[link.Aside] = append(adj[link.Aside], link.Zside)
		// For bidirectional/undirected links, add the reverse
		if link.Direction == l8topo.L8TopologyLinkDirection_Bidirectional ||
			link.Direction == l8topo.L8TopologyLinkDirection_InvalidDirection {
			adj[link.Zside] = append(adj[link.Zside], link.Aside)
		}
	}
	return adj
}
