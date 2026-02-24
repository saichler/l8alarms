package notification

import (
	"bytes"
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"net/http"
	"time"
)

// Send dispatches a notification message to the specified channel and endpoint.
func Send(channel alm.NotificationChannel, endpoint, message string) error {
	switch channel {
	case alm.NotificationChannel_NOTIFICATION_CHANNEL_WEBHOOK:
		return sendWebhook(endpoint, message)
	case alm.NotificationChannel_NOTIFICATION_CHANNEL_EMAIL:
		return sendLog("email", endpoint, message)
	case alm.NotificationChannel_NOTIFICATION_CHANNEL_SLACK:
		return sendWebhook(endpoint, fmt.Sprintf(`{"text":%q}`, message))
	case alm.NotificationChannel_NOTIFICATION_CHANNEL_PAGERDUTY:
		return sendLog("pagerduty", endpoint, message)
	default:
		return sendLog("unknown", endpoint, message)
	}
}

// sendWebhook posts a JSON message to a webhook endpoint.
func sendWebhook(url, message string) error {
	body := fmt.Sprintf(`{"message":%q}`, message)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBufferString(body))
	if err != nil {
		return fmt.Errorf("webhook failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}
	return nil
}

// sendLog is a fallback that logs the notification (for channels not yet implemented).
func sendLog(channel, endpoint, message string) error {
	fmt.Printf("[notification] %s -> %s: %s\n", channel, endpoint, message)
	return nil
}
