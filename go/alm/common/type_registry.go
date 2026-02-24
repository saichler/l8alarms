package common

import (
	"github.com/saichler/l8types/go/ifs"
)

// RegisterType registers a type and its list wrapper with the introspector and registry.
func RegisterType[T any, TList any](resources ifs.IResources, pkField string) {
	resources.Introspector().Decorators().AddPrimaryKeyDecorator(new(T), pkField)
	resources.Registry().Register(new(TList))
}
