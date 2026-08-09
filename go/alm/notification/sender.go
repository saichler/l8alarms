package notification

import (
	"fmt"
	"github.com/saichler/l8types/go/ifs"
	l8notify "github.com/saichler/l8types/go/types/l8notify"
)

// Send dispatches a single notification through the Notify service via vnic.
func Send(vnic ifs.IVNic, ch l8notify.NotifyChannel, endpoint, subject, message string, attributes map[string]string) error {
	result := vnic.Resources().Notify().Send(ch, endpoint, subject, message, attributes)
	if result != nil && result.ErrorMessage != "" {
		return fmt.Errorf("%s", result.ErrorMessage)
	}
	return nil
}
