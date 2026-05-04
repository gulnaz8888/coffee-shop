#!/bin/bash

echo "[INFO] Validating environment variables..."

required_vars=("JWT_SECRET" "MONGO_URI")

if [ -f .env ]; then
    source .env
fi

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "[ERROR] $var is not set"
        exit 1
    fi
done

echo "[SUCCESS] All environment variables are valid"
exit 0