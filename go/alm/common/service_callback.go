package common

import (
	"errors"
	"fmt"
	"github.com/saichler/l8types/go/ifs"
)

// ValidateFunc is a function that validates an entity.
type ValidateFunc[T any] func(*T, ifs.IVNic) error

// ActionValidateFunc is a function that validates an entity with access to the CRUD action.
type ActionValidateFunc[T any] func(*T, ifs.Action, ifs.IVNic) error

// SetIDFunc is a function that generates/sets the primary key on an entity.
type SetIDFunc[T any] func(*T)

type genericCallback[T any] struct {
	typeName         string
	setID            SetIDFunc[T]
	validate         ValidateFunc[T]
	actionValidators []ActionValidateFunc[T]
	afterActions     []ActionValidateFunc[T]
}

// NewServiceCallback creates a standard IServiceCallback.
func NewServiceCallback[T any](typeName string, setID SetIDFunc[T], validate ValidateFunc[T], actionValidators ...ActionValidateFunc[T]) ifs.IServiceCallback {
	return &genericCallback[T]{
		typeName:         typeName,
		setID:            setID,
		validate:         validate,
		actionValidators: actionValidators,
	}
}

// NewServiceCallbackWithAfter creates a ServiceCallback with after-actions.
func NewServiceCallbackWithAfter[T any](typeName string, setID SetIDFunc[T], validate ValidateFunc[T], actionValidators []ActionValidateFunc[T], afterActions []ActionValidateFunc[T]) ifs.IServiceCallback {
	return &genericCallback[T]{
		typeName:         typeName,
		setID:            setID,
		validate:         validate,
		actionValidators: actionValidators,
		afterActions:     afterActions,
	}
}

func (cb *genericCallback[T]) Before(any interface{}, action ifs.Action, cont bool, vnic ifs.IVNic) (interface{}, bool, error) {
	entity, ok := any.(*T)
	if !ok {
		return nil, false, errors.New("invalid " + cb.typeName + " type")
	}
	if action == ifs.POST {
		cb.setID(entity)
	}
	for _, av := range cb.actionValidators {
		if err := av(entity, action, vnic); err != nil {
			return nil, false, err
		}
	}
	if cb.validate != nil {
		if err := cb.validate(entity, vnic); err != nil {
			return nil, false, err
		}
	}
	return nil, true, nil
}

func (cb *genericCallback[T]) After(any interface{}, action ifs.Action, cont bool, vnic ifs.IVNic) (interface{}, bool, error) {
	if len(cb.afterActions) == 0 {
		return nil, true, nil
	}
	entity, ok := any.(*T)
	if !ok {
		return nil, true, nil
	}
	for _, aa := range cb.afterActions {
		if err := aa(entity, action, vnic); err != nil {
			fmt.Println("[cascade] warning:", err.Error())
		}
	}
	return nil, true, nil
}
