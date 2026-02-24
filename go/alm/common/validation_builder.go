package common

import (
	"github.com/saichler/l8types/go/ifs"
)

// VB (Validation Builder) chains validators for a ServiceCallback.
type VB[T any] struct {
	typeName         string
	setID            SetIDFunc[T]
	validators       []func(*T, ifs.IVNic) error
	actionValidators []ActionValidateFunc[T]
	afterActions     []ActionValidateFunc[T]
}

// NewValidation creates a validation builder for a ServiceCallback.
func NewValidation[T any](typeName string, setID SetIDFunc[T]) *VB[T] {
	return &VB[T]{typeName: typeName, setID: setID}
}

// Require adds a required string field validation.
func (b *VB[T]) Require(getter func(*T) string, name string) *VB[T] {
	b.validators = append(b.validators, func(e *T, _ ifs.IVNic) error {
		return ValidateRequired(getter(e), name)
	})
	return b
}

// RequireInt64 adds a required int64 field validation.
func (b *VB[T]) RequireInt64(getter func(*T) int64, name string) *VB[T] {
	b.validators = append(b.validators, func(e *T, _ ifs.IVNic) error {
		return ValidateRequiredInt64(getter(e), name)
	})
	return b
}

// Enum adds an enum field validation using the protobuf _name map.
func (b *VB[T]) Enum(getter func(*T) int32, nameMap map[int32]string, name string) *VB[T] {
	b.validators = append(b.validators, func(e *T, _ ifs.IVNic) error {
		return ValidateEnum(getter(e), nameMap, name)
	})
	return b
}

// DateNotZero adds a required date (non-zero timestamp) validation.
func (b *VB[T]) DateNotZero(getter func(*T) int64, name string) *VB[T] {
	b.validators = append(b.validators, func(e *T, _ ifs.IVNic) error {
		return ValidateDateNotZero(getter(e), name)
	})
	return b
}

// Custom adds a custom validation function.
func (b *VB[T]) Custom(fn func(*T, ifs.IVNic) error) *VB[T] {
	b.validators = append(b.validators, fn)
	return b
}

// BeforeAction adds an action-aware validator that runs before persistence.
// Unlike Custom, it receives the CRUD action so it can branch on POST/PUT/etc.
func (b *VB[T]) BeforeAction(fn ActionValidateFunc[T]) *VB[T] {
	b.actionValidators = append(b.actionValidators, fn)
	return b
}

// After adds a function to run after successful persistence.
func (b *VB[T]) After(fn ActionValidateFunc[T]) *VB[T] {
	b.afterActions = append(b.afterActions, fn)
	return b
}

// Build creates the IServiceCallback from the chained validators.
func (b *VB[T]) Build() ifs.IServiceCallback {
	validate := func(item *T, vnic ifs.IVNic) error {
		for _, v := range b.validators {
			if err := v(item, vnic); err != nil {
				return err
			}
		}
		return nil
	}
	if len(b.afterActions) > 0 {
		return NewServiceCallbackWithAfter(b.typeName, b.setID, validate,
			b.actionValidators, b.afterActions)
	}
	return NewServiceCallback(b.typeName, b.setID, validate, b.actionValidators...)
}
