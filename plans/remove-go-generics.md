# Plan: Remove Go Generics from l8alarms

## Summary

Replace all Go generics with `l8common` abstractions. Most of l8alarms' generic code already has a non-generic equivalent in `../l8common/go/common/`. The migration is primarily: delete local generic files, import l8common, update call sites.

**Both gaps have been resolved** — `BeforeAction` and `GetEntitiesByQuery` have been added to l8common. Phase 0 is complete.

---

## l8common Coverage Map

| l8alarms generic | l8common equivalent | Direct replacement? |
|---|---|---|
| `ActivateService[T,TList,PT,PTL]` | `common.ActivateService(cfg, item, itemList, creds, db, vnic)` | Yes - all 10 services are Transactional:true, matches l8common's always-transactional behavior |
| `RegisterType[T,TList]` | `common.RegisterType(resources, typeInst, listInst, pkField)` | Yes for single-pk. One call has 2 pk fields (L8TopologyMetadata) - needs direct decorator call |
| `GetEntity[T]` | `common.GetEntity(svcName, area, filter, vnic)` returns `interface{}` | Yes - caller adds type assertion |
| `PutEntity[T]` | `common.PutEntity(svcName, area, entity, vnic)` | Yes |
| `GetEntities[T]` (query string) | `common.GetEntitiesByQuery(svcName, area, query, vnic)` returns `[]interface{}` | Yes |
| `extractElements[T]` | Not needed - l8common returns `[]interface{}` directly | Delete |
| `ServiceHandler` | `common.ServiceHandler` | Identical |
| `ServiceConfig` | `common.ServiceConfig` (has `ServiceGroup` instead of `Transactional`) | Yes |
| `NewServiceCallback[T]` | `common.NewServiceCallback(name, typeCheck, setID, validate, ...)` | Yes |
| `NewServiceCallbackWithAfter[T]` | `common.NewServiceCallbackWithAfter(...)` | Yes |
| `ValidateFunc[T]` | `common.ValidateFunc` = `func(interface{}, IVNic) error` | Yes |
| `ActionValidateFunc[T]` | `common.ActionValidateFunc` = `func(interface{}, Action, IVNic) error` | Yes |
| `SetIDFunc[T]` | `common.SetIDFunc` = `func(interface{})` | Yes |
| `VB[T]` / `NewValidation[T]` | `common.VB` / `common.NewValidation(typeInst, vnic)` - auto-derives typeName, typeCheck, setID from introspector | Yes - but callback constructors must receive `vnic` |
| `VB[T].Require/Enum/etc` | `common.VB.Require/Enum/etc` with `func(interface{})` getters | Yes |
| `VB[T].BeforeAction` | `common.VB.BeforeAction` - accepts typed funcs via reflection | Yes |
| `VB[T].Custom` | `common.VB.Custom` - accepts typed funcs via reflection | Yes |
| `VB[T].After` | `common.VB.After` - accepts typed funcs via reflection | Yes |
| `GenerateID` | `common.GenerateID` | Yes |
| `ValidateRequired/Enum/etc` | `common.ValidateRequired/Enum/etc` | Yes |
| `OpenDBConnection` | l8common's `ActivateService` handles DB internally | Delete from l8alarms |
| `CreateResources` | Keep local - has project-specific constants (ALM_VNET, PREFIX) | Keep |
| mock `extractIDs[T]` | No equivalent | Rewrite with `interface{}` getters |

---

## ~~Gaps~~ Resolved

### ~~Gap 1~~: GetEntitiesByQuery — DONE

Added `GetEntitiesByQuery(serviceName, serviceArea, query, vnic)` to `../l8common/go/common/service_factory.go`. Handles both local service handler and remote vnic request paths.

### ~~Gap 2~~: VB.BeforeAction — DONE

Added `BeforeAction(fn interface{})` to `../l8common/go/common/validation_builder.go`. Same reflection pattern as `After()` — accepts both `ActionValidateFunc` and typed `func(*ConcreteType, ifs.Action, ifs.IVNic) error`.

Both changes build cleanly (`go build ./...` passes in l8common).

---

## Phases

### ~~Phase 0: Add BeforeAction + GetEntitiesByQuery to l8common~~ DONE

### Phase 1: Replace `go/alm/common/` files

**Delete these 5 files** (replaced entirely by l8common):
- `service_callback.go` — `common.NewServiceCallback` / function types
- `validation_builder.go` — `common.VB` / `common.NewValidation`
- `service_factory.go` — `common.ActivateService` / `GetEntity` / `GetEntitiesByQuery` / `PutEntity`
- `type_registry.go` — `common.RegisterType`
- `validation.go` — `common.ValidateRequired` / `ValidateEnum` / `GenerateID` / etc.

**Keep (trimmed):**
- `defaults.go` — remove `OpenDBConnection`, `WaitForSignal`, `CreateResources` body, `dbInstance`, `dbMtx` (all duplicated in l8common). Keep only project-specific constants and a thin `CreateResources` wrapper:
```go
package common

import "github.com/saichler/l8common/go/common"

const (
    ALM_VNET = 35050
    PREFIX   = "/alm/"
)

var DB_CREDS = "admin"
var DB_NAME = "admin"

func CreateResources(alias string) ifs.IResources {
    return common.CreateResources(alias, "/data/logs/alm", uint32(ALM_VNET))
}
```
`WaitForSignal` callers switch to `common.WaitForSignal` directly.

### Phase 2: Update all service Activate calls (10 files)

Each service file changes from:
```go
common.ActivateService[alm.Alarm, alm.AlarmList](common.ServiceConfig{
    ServiceName: ServiceName, ServiceArea: ServiceArea,
    PrimaryKey: "AlarmId", Callback: newAlarmServiceCallback(),
    Transactional: true,
}, creds, dbname, vnic)
```
To:
```go
common.ActivateService(common.ServiceConfig{
    ServiceName: ServiceName, ServiceArea: ServiceArea,
    PrimaryKey: "AlarmId", Callback: newAlarmServiceCallback(vnic),
}, &alm.Alarm{}, &alm.AlarmList{}, creds, dbname, vnic)
```

Note: `newXxxServiceCallback()` becomes `newXxxServiceCallback(vnic)` — l8common's `NewValidation` needs vnic for introspector-based type derivation.

Import changes: `common` import path switches from `l8alarms/go/alm/common` to `l8common/go/common` for all service factory / validation / callback usages. The local `common` package (defaults.go) keeps its import path for project-specific constants.

**Files:** `AlarmService.go`, `EventService.go`, `AlarmDefinitionService.go`, `AlarmFilterService.go`, `CorrelationRuleService.go`, `NotificationPolicyService.go`, `EscalationPolicyService.go`, `MaintenanceWindowService.go`, `ArchivedAlarmService.go`, `ArchivedEventService.go`

### Phase 3: Update all ServiceCallback files (10 files)

Each callback file changes from:
```go
func newAlarmServiceCallback() ifs.IServiceCallback {
    return common.NewValidation[alm.Alarm]("Alarm",
        func(e *alm.Alarm) { common.GenerateID(&e.AlarmId) }).
        Require(func(e *alm.Alarm) string { return e.AlarmId }, "AlarmId").
        Enum(func(e *alm.Alarm) int32 { return int32(e.State) }, ..., "State").
        BeforeAction(protectSystemFields).
        After(runCorrelation).
        Build()
}
```
To:
```go
func newAlarmServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
    return common.NewValidation(&alm.Alarm{}, vnic).
        Require(func(e interface{}) string { return e.(*alm.Alarm).AlarmId }, "AlarmId").
        Enum(func(e interface{}) int32 { return int32(e.(*alm.Alarm).State) }, ..., "State").
        BeforeAction(protectSystemFields).
        After(runCorrelation).
        Build()
}
```

Key changes:
- Takes `vnic` parameter
- No manual typeName or setID — `NewValidation(&alm.Alarm{}, vnic)` auto-derives both from introspector
- Getter functions use `interface{}` with cast
- `BeforeAction`/`After` typed helper functions (e.g., `protectSystemFields(*alm.Alarm, ifs.Action, ifs.IVNic) error`) work as-is via l8common's reflection wrapping

Also update BeforeAction/After helper function signatures from typed to `interface{}`:
- `protectSystemFields`, `validateStateTransition`, `checkMaintenanceWindow` (alarms)
- `rejectPut` (events, archived alarms, archived events)
- `runCorrelation`, `runNotification`, `runEscalation` (alarms after-actions)

### Phase 4: Update GetEntities/GetEntity/PutEntity callers (8 files)

**GetEntities callers** — use l8common `GetEntitiesByQuery` + type assertion:
```go
// Before:
rules, err := common.GetEntities[alm.CorrelationRule](svcName, area, query, vnic)

// After:
rulesRaw, err := common.GetEntitiesByQuery(svcName, area, query, vnic)
rules := make([]*alm.CorrelationRule, 0, len(rulesRaw))
for _, r := range rulesRaw { rules = append(rules, r.(*alm.CorrelationRule)) }
```

**GetEntity callers** — add type assertion:
```go
// Before:
return common.GetEntity(ServiceName, ServiceArea, &alm.Alarm{AlarmId: id}, vnic)

// After:
result, err := common.GetEntity(ServiceName, ServiceArea, &alm.Alarm{AlarmId: id}, vnic)
if err != nil || result == nil { return nil, err }
return result.(*alm.Alarm), nil
```

**PutEntity callers** — no signature change needed (l8common takes `interface{}`).

**Files:** `correlation_runner.go`, `notification/engine.go`, `escalation/scheduler.go`, `enrichment/EnrichmentService.go`, `maintenancewindows/checker.go`, `archiving/engine.go`, `AlarmService.go`

### Phase 5: Update `go/alm/ui/shared_alm.go` (RegisterType calls)

```go
// Before:
common.RegisterType[alm.Alarm, alm.AlarmList](resources, "AlarmId")

// After:
common.RegisterType(resources, &alm.Alarm{}, &alm.AlarmList{}, "AlarmId")
```

For the multi-pk case (L8TopologyMetadata with "ServiceName", "ServiceArea"), call decorator directly since l8common's `RegisterType` takes a single pkField:
```go
resources.Introspector().Decorators().AddPrimaryKeyDecorator(&l8topo.L8TopologyMetadata{}, "ServiceName", "ServiceArea")
resources.Registry().Register(&l8topo.L8TopologyMetadataList{})
```

### Phase 6: Update `go/tests/mocks/phase_helpers.go`

Replace generic `extractIDs[T]` with reflection-based version:
```go
func extractIDs(items interface{}, getter func(interface{}) string) []string {
    v := reflect.ValueOf(items)
    ids := make([]string, v.Len())
    for i := 0; i < v.Len(); i++ {
        ids[i] = getter(v.Index(i).Interface())
    }
    return ids
}
```

Update 10 call sites in `phases.go`:
```go
// Before:
extractIDs(defs, func(e *alm.AlarmDefinition) string { return e.DefinitionId })
// After:
extractIDs(defs, func(e interface{}) string { return e.(*alm.AlarmDefinition).DefinitionId })
```

### Phase 7: Vendor refresh + build + test verification

```bash
cd go && rm -rf go.sum go.mod vendor && go mod init && GOPROXY=direct GOPRIVATE=github.com go mod tidy && go mod vendor
go build ./...
go vet ./...
```

Confirm zero generics remain (excluding vendor):
```bash
grep -rn '\[.*any\]\|\[T \|T any\|T comparable' --include='*.go' go/alm/ go/tests/
```

Run all existing tests end-to-end (per `test-location-and-approach` — tests use the system API via IVNic):
```bash
cd go && go test ./tests/...
```

Tests to pass:
- [ ] `TestCRUD_test.go` — validates POST/GET/PUT/DELETE through service callbacks (exercises `NewValidation`, `ActivateService`, `GetEntity`, `PutEntity`)
- [ ] `TestValidation_test.go` — validates field validation (exercises `VB.Require`, `VB.Enum`, `BeforeAction`)
- [ ] `TestCorrelation_test.go` — validates correlation engine (exercises `GetEntitiesByQuery`, `PutEntity`, after-actions)
- [ ] `TestServiceHandlers_test.go` — validates service handler lookups
- [ ] `TestServiceGetters_test.go` — validates entity getter helpers
- [ ] `TestAllService_test.go` — validates all services activate correctly

---

## Traceability Matrix

| # | Item | Phase |
|---|------|-------|
| 1 | ~~Add `BeforeAction` to l8common VB~~ | ~~Phase 0~~ DONE |
| 2 | ~~Add `GetEntitiesByQuery` to l8common~~ | ~~Phase 0~~ DONE |
| 3 | Delete `service_callback.go` | Phase 1 |
| 4 | Delete `validation_builder.go` | Phase 1 |
| 5 | Delete `service_factory.go` | Phase 1 |
| 6 | Delete `type_registry.go` | Phase 1 |
| 7 | Delete `validation.go` | Phase 1 |
| 8 | Trim `defaults.go`: remove `OpenDBConnection`, `WaitForSignal`, `CreateResources` body, `dbInstance`/`dbMtx`; delegate to l8common | Phase 1 |
| 9 | 10x `ActivateService` calls → pass proto instances, use l8common | Phase 2 |
| 10 | 10x callback constructors → take vnic, use l8common `NewValidation` | Phase 3 |
| 11 | BeforeAction/After helper functions → `interface{}` signatures | Phase 3 |
| 12 | 8x `GetEntities` calls → `GetEntitiesByQuery` + type assert | Phase 4 |
| 13 | 1x `GetEntity` call → type assert result | Phase 4 |
| 14 | 2x `PutEntity` calls → use l8common directly | Phase 4 |
| 15 | 10x `RegisterType` calls (single-pk) → pass instances | Phase 5 |
| 16 | 1x multi-pk RegisterType → direct decorator call | Phase 5 |
| 17 | `extractIDs[T]` definition → reflection-based | Phase 6 |
| 18 | 10x `extractIDs` calls → `interface{}` getters | Phase 6 |
| 19 | Vendor refresh + build + vet | Phase 7 |

---

## Files Deleted (5)

- `go/alm/common/service_callback.go`
- `go/alm/common/validation_builder.go`
- `go/alm/common/service_factory.go`
- `go/alm/common/type_registry.go`
- `go/alm/common/validation.go`

## Files Modified (~25)

- `go/alm/common/defaults.go` — trim to constants + thin `CreateResources` wrapper
- `go/alm/main/main.go` — `WaitForSignal` call → `common.WaitForSignal`
- `go/alm/vnet/main.go` — `WaitForSignal` call → `common.WaitForSignal`
- 10 service files — `ActivateService` calls
- 10 callback files — `NewValidation` + getter signatures + helper functions
- `go/alm/ui/shared_alm.go` — `RegisterType` calls
- 6 engine/scheduler files — `GetEntities`/`GetEntity`/`PutEntity` calls
- `go/tests/mocks/phase_helpers.go` — `extractIDs`
- `go/tests/mocks/phases.go` — `extractIDs` calls
