#!/usr/bin/env bash

set -e

# Download / copy proto dependencies
wget -q https://raw.githubusercontent.com/saichler/l8types/refs/heads/main/proto/api.proto
wget -q https://raw.githubusercontent.com/saichler/l8types/refs/heads/main/proto/l8events.proto
wget -q https://raw.githubusercontent.com/saichler/l8types/refs/heads/main/proto/l8notify.proto

PROTOS=(
    alm-common.proto
    alm-definitions.proto
    alm-alarms.proto
    alm-correlation.proto
    alm-policies.proto
    alm-filters.proto
    alm-archive.proto
)

# Use the protoc image to run protoc.sh and generate Go + Rust bindings.
for p in "${PROTOS[@]}"; do
    docker run --user "$(id -u):$(id -g)" -e PROTO="$p" --mount type=bind,source="$PWD",target=/home/proto/ -i saichler/protoc:latest
done

rm -rf api.proto
rm -rf l8events.proto
rm -rf l8notify.proto

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
find . -name "*.go" -type f -exec sed -i 's|"./types/l8events"|"github.com/saichler/l8types/go/types/l8events"|g' {} +
find . -name "*.go" -type f -exec sed -i 's|"./types/l8notify"|"github.com/saichler/l8types/go/types/l8notify"|g' {} +
