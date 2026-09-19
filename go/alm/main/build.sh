#!/usr/bin/env bash
set -e
docker build --no-cache --platform=linux/amd64 -t saichler/alm:latest .
docker push saichler/alm:latest
