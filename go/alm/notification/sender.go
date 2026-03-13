package notification

import (
	"fmt"
	"github.com/saichler/l8notify/go/channel"
	l8notify "github.com/saichler/l8notify/go/types/l8notify"
)

// Send dispatches a notification message using l8notify channel dispatch.
// This is a convenience wrapper that constructs a NotifyTarget from channel+endpoint.
func Send(ch l8notify.NotifyChannel, endpoint, message string) error {
	target := &l8notify.NotifyTarget{
		Channel:  ch,
		Endpoint: endpoint,
	}
	result := channel.Dispatch(target, message, nil, nil)
	if result != nil && result.ErrorMessage != "" {
		return fmt.Errorf("%s", result.ErrorMessage)
	}
	return nil
}
