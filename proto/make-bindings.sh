#!/usr/bin/env bash

set -e

# Download / copy proto dependencies
wget -q https://raw.githubusercontent.com/saichler/l8types/refs/heads/main/proto/api.proto

# Copy l8events and l8notify protos from sibling projects (not yet published to GitHub)
PROJ_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cp "$PROJ_ROOT/l8events/proto/l8events.proto" .
cp "$PROJ_ROOT/l8notify/proto/l8notify.proto" .

# Generate bindings for all alarms proto files
docker run --user "$(id -u):$(id -g)" -e PROTO="alm-common.proto alm-definitions.proto alm-alarms.proto alm-events.proto alm-correlation.proto alm-policies.proto alm-maintenance.proto alm-filters.proto alm-archive.proto" --mount type=bind,source="$PWD",target=/home/proto/ -i saichler/protoc:latest

# Move generated bindings to the types directory and clean up
rm -rf ../go/types
mkdir -p ../go/types
cp -r ./types/* ../go/types/.
rm -rf ./types

# Clean up downloaded proto files
rm -f api.proto l8events.proto l8notify.proto
rm -rf *.rs

# Fix relative import paths in generated Go files
cd ../go
find . -name "*.go" -type f -exec sed -i 's|"./types/l8api"|"github.com/saichler/l8types/go/types/l8api"|g' {} +
find . -name "*.go" -type f -exec sed -i 's|"./types/l8events"|"github.com/saichler/l8events/go/types/l8events"|g' {} +
find . -name "*.go" -type f -exec sed -i 's|"./types/l8notify"|"github.com/saichler/l8notify/go/types/l8notify"|g' {} +
