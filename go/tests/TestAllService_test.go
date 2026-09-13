package tests

import (
	"crypto/tls"
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/services"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8types/go/ifs"
	"net/http"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	setup()
	m.Run()
	tear()
}

func openDBConnection(dbname, user, pass, port string) *sql.DB {
	if port == "" {
		port = "5432"
	}
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		"127.0.0.1", port, user, pass, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}
	if err = db.Ping(); err != nil {
		panic(fmt.Errorf("failed to connect to database: %w", err))
	}
	return db
}

func dropAllTables(t *testing.T, vnic ifs.IVNic) {
	creds := common.DB_CREDS
	dbname := common.DB_NAME
	_, user, pass, port, err := vnic.Resources().Security().Credential(creds, dbname, vnic.Resources())
	if err != nil {
		t.Fatalf("Failed to get credentials: %v", err)
	}
	db := openDBConnection(dbname, user, pass, port)
	_, err = db.Exec("DROP SCHEMA public CASCADE")
	if err != nil {
		t.Fatalf("Failed to drop schema: %v", err)
	}
	_, err = db.Exec("CREATE SCHEMA public")
	if err != nil {
		t.Fatalf("Failed to recreate schema: %v", err)
	}
	fmt.Println("Cleaned database (dropped and recreated public schema)")
}

func TestAllServices(t *testing.T) {
	erpServicesVnic := topo.VnicByVnetNum(1, 1)
	webServiceVnic := topo.VnicByVnetNum(3, 3)
	log := webServiceVnic.Resources().Logger()

	// 0. Drop all existing tables for a clean slate
	dropAllTables(t, erpServicesVnic)

	// Register types (incl. primary-key decorators) on erpServicesVnic's own
	// resources BEFORE activating services, matching alm/main/main.go's
	// order (ui.RegisterAlmTypes then services.ActivateAlmServices, same
	// resources throughout). Without this, common.NewValidation's setID
	// auto-ID lookup (in each VB-based ServiceCallback's constructor, which
	// runs as part of Activate()'s own argument evaluation) finds no
	// primary-key decorator yet and permanently falls back to a no-op —
	// startWebServer's own ui.RegisterAlmTypes call happens too late (after
	// ActivateAlmServices) and on the wrong vnic (webServiceVnic, not
	// erpServicesVnic) to fix this for the services vnic.
	ui.RegisterAlmTypes(erpServicesVnic.Resources())

	// 1. Activate all L8Alarms services on the services vNic
	services.ActivateAlmServices(common.DB_CREDS, common.DB_NAME, erpServicesVnic)

	// 2. Start web server on the web service vNic (non-blocking)
	port := 9443
	startWebServer(port, webServiceVnic, erpServicesVnic)
	time.Sleep(10 * time.Second)

	// 3. Create mock client pointing to web server
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	client := mocks.NewClient(fmt.Sprintf("https://localhost:%d", port), httpClient)
	err := client.Authenticate("operator", "operator")
	if err != nil {
		log.Fail(t, "Authentication failed: ", err.Error())
		return
	}

	// 4. Run all mock data phases
	testStore = &mocks.MockDataStore{}
	mocks.RunAllPhases(client, testStore, erpServicesVnic)

	// 5. Verify key entity counts
	if len(testStore.DefinitionIDs) == 0 {
		log.Fail(t, "No alarm definitions generated")
	}
	if len(testStore.AlarmIDs) == 0 {
		log.Fail(t, "No alarms generated")
	}

	mocks.PrintSummary(testStore)

	// 6. Test service handlers (all 8 services)
	testServiceHandlers(t, erpServicesVnic)

	// 7. Test service getters (all 8 services)
	testServiceGetters(t, erpServicesVnic)

	// 8. Test CRUD lifecycle
	testCRUD(t, client, erpServicesVnic)

	// 9. Test validation
	testValidation(t, client, erpServicesVnic)

	// 10. Test the EventRecord -> Alarm decision flow (create/merge/drop,
	// threshold state, dedup, clear) end to end
	testAlarmFlow(t, client, erpServicesVnic)

	// 11. Test correlation engine
	testCorrelation(t, client, erpServicesVnic)
}
