package common

import (
	"database/sql"
	"fmt"
	"github.com/saichler/l8reflect/go/reflect/introspecting"
	"github.com/saichler/l8services/go/services/manager"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/sec"
	"github.com/saichler/l8types/go/types/l8sysconfig"
	"github.com/saichler/l8utils/go/utils/logger"
	"github.com/saichler/l8utils/go/utils/registry"
	"github.com/saichler/l8utils/go/utils/resources"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

const (
	ALM_VNET = 35050
	PREFIX   = "/alm/"
)

var DB_CREDS = "admin"
var DB_NAME = "admin"

var dbInstance *sql.DB
var dbMtx = &sync.Mutex{}

func CreateResources(alias string) ifs.IResources {
	//logger.SetLogToFile("/data/logs/alm", alias)
	log := logger.NewLoggerImpl(&logger.FmtLogMethod{})
	log.SetLogLevel(ifs.Info_Level)
	res := resources.NewResources(log)

	res.Set(registry.NewRegistry())

	sec, _ := sec.LoadSecurityProvider(res)
	res.Set(sec)

	conf := &l8sysconfig.L8SysConfig{
		MaxDataSize:              resources.DEFAULT_MAX_DATA_SIZE,
		RxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		TxQueueSize:              resources.DEFAULT_QUEUE_SIZE,
		LocalAlias:               alias,
		VnetPort:                 uint32(ALM_VNET),
		LogsDirectory:            "/data/logs/alm",
		KeepAliveIntervalSeconds: 30,
	}
	res.Set(conf)

	res.Set(introspecting.NewIntrospect(res.Registry()))
	res.Set(manager.NewServices(res))

	return res
}

func WaitForSignal(resources ifs.IResources) {
	resources.Logger().Info("Waiting for os signal...")
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigs
	resources.Logger().Info("End signal received! ", sig)
}

// OpenDBConnection establishes a connection to the PostgreSQL database.
func OpenDBConnection(dbname, user, pass, port string) *sql.DB {
	dbMtx.Lock()
	defer dbMtx.Unlock()
	if dbInstance != nil {
		return dbInstance
	}
	if port == "" {
		port = "5432"
	}
	psqlInfo := fmt.Sprintf("host=127.0.0.1 port=%s user=%s "+
		"password=%s dbname=%s sslmode=disable",
		"127.0.0.1", port, user, pass, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}
	err = db.Ping()
	if err != nil {
		panic(fmt.Errorf("failed to connect to database: %w", err))
	}
	dbInstance = db
	return dbInstance
}
