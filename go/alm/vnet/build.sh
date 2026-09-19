#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/alm-vnet:latest .
docker push saichler/alm-vnet:latest
