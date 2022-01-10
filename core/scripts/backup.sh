#!/usr/bin/env bash

set -e

BACKUP_FILE='backupV1.txt'
HOST='http://localhost:3000/graphql'

echo "Backing up database from: ${HOST}"

curl $HOST \
  -f \
  -H 'Content-Type: application/json' \
  --data-raw '{"query":"query{backupV1}"}' \
  --compressed | jq .data.backupV1 > $BACKUP_FILE

echo "Backup written to: ${BACKUP_FILE}"