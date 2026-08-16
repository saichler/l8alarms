package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8utils/go/utils/timer"
	"time"
)

// alarmTimers tracks the threshold-window, correlation-window, and
// auto-clear timers for every alarm. One TimerManager, three distinct keys
// per alarm (an alarm can have more than one of these running at once).
var alarmTimers = timer.NewTimerManager()

func thresholdTimerKey(alarmId string) string   { return alarmId + ":threshold" }
func correlationTimerKey(alarmId string) string { return alarmId + ":correlation" }
func autoClearTimerKey(alarmId string) string   { return alarmId + ":autoclear" }

// startThresholdTimer begins the threshold-window timer for a newly created
// PENDING_THRESHOLD alarm. If the window closes before OccurrenceCount
// reaches threshold_count, the alarm never should have existed and is
// deleted (create-then-delete, per direct instruction — see the plan).
func startThresholdTimer(alarmId string, windowSeconds int32, vnic ifs.IVNic) {
	if windowSeconds <= 0 {
		return
	}
	alarmTimers.Start(thresholdTimerKey(alarmId), time.Duration(windowSeconds)*time.Second, func() {
		current, err := GetAlarm(alarmId, vnic)
		if err != nil || current == nil {
			return
		}
		if current.CorrelationThresholdState != alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD {
			return // already progressed past PENDING_THRESHOLD — nothing to do
		}
		if err := DeleteAlarm(alarmId, vnic); err != nil {
			fmt.Printf("[alarms] threshold-window delete failed for %s: %v\n", alarmId, err)
		}
	})
}

func cancelThresholdTimer(alarmId string) {
	alarmTimers.Cancel(thresholdTimerKey(alarmId))
}

// startCorrelationTimer begins the correlation-window timer for an alarm
// that just became OPEN_FOR_CORRELATION. On fire, it transitions to STABLE
// and is evicted from the correlation-eligible cache.
func startCorrelationTimer(alarmId string, windowSeconds int32, vnic ifs.IVNic) {
	if windowSeconds <= 0 {
		return
	}
	alarmTimers.Start(correlationTimerKey(alarmId), time.Duration(windowSeconds)*time.Second, func() {
		current, err := GetAlarm(alarmId, vnic)
		if err != nil || current == nil {
			return
		}
		if current.CorrelationThresholdState != alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION {
			return
		}
		current.CorrelationThresholdState = alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_STABLE
		if err := common.PutEntity(ServiceName, ServiceArea, current, vnic); err != nil {
			fmt.Printf("[alarms] correlation-window STABLE transition failed for %s: %v\n", alarmId, err)
		}
		evictCorrelationEligible(alarmId)
	})
}

func cancelCorrelationTimer(alarmId string) {
	alarmTimers.Cancel(correlationTimerKey(alarmId))
}

// startAutoClearTimer begins the auto-clear timer for an alarm per its
// definition's auto_clear_seconds. On fire (no matching event arrived in
// time), the alarm is cleared.
func startAutoClearTimer(alarmId string, autoClearSeconds int32, vnic ifs.IVNic) {
	if autoClearSeconds <= 0 {
		return
	}
	alarmTimers.Start(autoClearTimerKey(alarmId), time.Duration(autoClearSeconds)*time.Second, func() {
		current, err := GetAlarm(alarmId, vnic)
		if err != nil || current == nil {
			return
		}
		if current.State == alm.AlarmState_ALARM_STATE_CLEARED {
			return
		}
		if err := clearAlarm(current, "system:auto-clear", vnic); err != nil {
			fmt.Printf("[alarms] auto-clear failed for %s: %v\n", alarmId, err)
		}
	})
}

// resetAutoClearTimer restarts the running auto-clear timer (e.g. on
// MERGE) with a fresh duration, reusing its existing onFire callback.
// No-op if no auto-clear timer is currently running for this alarm.
func resetAutoClearTimer(alarmId string, autoClearSeconds int32) {
	if autoClearSeconds <= 0 {
		return
	}
	alarmTimers.Reset(autoClearTimerKey(alarmId), time.Duration(autoClearSeconds)*time.Second)
}

func cancelAutoClearTimer(alarmId string) {
	alarmTimers.Cancel(autoClearTimerKey(alarmId))
}

// cancelAllTimers stops every running timer for an alarm. Used on CLEAR.
func cancelAllTimers(alarmId string) {
	cancelThresholdTimer(alarmId)
	cancelCorrelationTimer(alarmId)
	cancelAutoClearTimer(alarmId)
}
