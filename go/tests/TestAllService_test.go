package tests

import (
	"crypto/tls"
	"fmt"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/services"
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

func dropAllTables(t *testing.T, vnic ifs.IVNic) {
	creds := common.DB_CREDS
	dbname := common.DB_NAME
	_, user, pass, _, err := vnic.Resources().Security().Credential(creds, dbname, vnic.Resources())
	if err != nil {
		t.Fatalf("Failed to get credentials: %v", err)
	}
	db := common.OpenDBConnection(dbname, user, pass)
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
	mocks.RunAllPhases(client, testStore)

	// 5. Verify key entity counts
	if len(testStore.DefinitionIDs) == 0 {
		log.Fail(t, "No alarm definitions generated")
	}
	if len(testStore.AlarmIDs) == 0 {
		log.Fail(t, "No alarms generated")
	}
	if len(testStore.EventIDs) == 0 {
		log.Fail(t, "No events generated")
	}

	mocks.PrintSummary(testStore)

	// 6. Test service handlers (all 8 services)
	testServiceHandlers(t, erpServicesVnic)

	// 7. Test service getters (all 8 services)
	testServiceGetters(t, erpServicesVnic)

	// 8. Test CRUD lifecycle
	testCRUD(t, client)

	// 9. Test validation
	testValidation(t, client)

	// 10. Test correlation engine, maintenance windows
	testCorrelation(t, client)
}
