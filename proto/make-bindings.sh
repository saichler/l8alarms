#!/usr/bin/env bash

set -e

# Download the api.proto dependency from l8types
wget -q https://raw.githubusercontent.com/saichler/l8types/refs/heads/main/proto/api.proto

# Generate bindings for all alarms proto files
docker run --user "$(id -u):$(id -g)" -e PROTO="alm-common.proto alm-definitions.proto alm-alarms.proto alm-events.proto alm-correlation.proto alm-policies.proto alm-maintenance.proto alm-filters.proto" --mount type=bind,source="$PWD",target=/home/proto/ -it saichler/protoc:latest

# Move generated bindings to the types directory and clean up
rm -rf ../go/types
mkdir -p ../go/types
mv ./types/* ../go/types/.
rm -rf ./types

# Clean up
rm -f api.proto
rm -rf *.rs

# Fix relative import paths in generated Go files
cd ../go
find . -name "*.go" -type f -exec sed -i 's|"./types/l8api"|"github.com/saichler/l8types/go/types/l8api"|g' {} +
