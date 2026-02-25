package main

import (
	"flag"
	"github.com/saichler/l8alarms/go/tests/mocks"
)

func main() {
	address := flag.String("address", "https://localhost:2780", "Server address")
	user := flag.String("user", "admin", "Username")
	password := flag.String("password", "admin", "Password")
	insecure := flag.Bool("insecure", true, "Skip TLS certificate verification")
	flag.Parse()

	mocks.RunMockGenerator(*address, *user, *password, *insecure)
}
