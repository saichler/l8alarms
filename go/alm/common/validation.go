package common

import (
	"fmt"
	"github.com/google/uuid"
)

// ValidateRequired validates that a string field is not empty.
func ValidateRequired(value, name string) error {
	if value == "" {
		return fmt.Errorf("%s is required", name)
	}
	return nil
}

// ValidateRequiredInt64 validates that an int64 field is not zero.
func ValidateRequiredInt64(value int64, name string) error {
	if value == 0 {
		return fmt.Errorf("%s is required", name)
	}
	return nil
}

// ValidateEnum validates that an enum value is valid and not UNSPECIFIED (0).
func ValidateEnum(value int32, nameMap map[int32]string, name string) error {
	if value == 0 {
		return fmt.Errorf("%s is required", name)
	}
	if _, ok := nameMap[value]; !ok {
		return fmt.Errorf("%s has invalid value: %d", name, value)
	}
	return nil
}

// ValidateDateNotZero validates that a timestamp is not zero.
func ValidateDateNotZero(value int64, name string) error {
	if value == 0 {
		return fmt.Errorf("%s is required", name)
	}
	return nil
}

// GenerateID generates a UUID and sets it on the given string pointer if empty.
func GenerateID(field *string) {
	if *field == "" {
		*field = uuid.New().String()
	}
}
