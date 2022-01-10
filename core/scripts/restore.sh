#!/usr/bin/env bash

set -e

BACKUP_FILE='backupV1.txt'
HOST='http://localhost:3000/graphql'

echo "Restoring: ${BACKUP_FILE} to: ${HOST}"

BACKUP_FILE_DATA=$(cat $BACKUP_FILE)
MUTATION="mutation {restoreV1(backup: $BACKUP_FILE_DATA)}"
QUERY=$(jq -n --arg mutation "$MUTATION" '{query: $mutation}')

curl $HOST \
  -f \
  -H 'Content-Type: application/json' \
  --data-raw "$QUERY" \
  --compressed

echo "Database restored!"
