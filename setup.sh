#!/usr/bin/env bash

set -ex

git config core.editor "code"
git config pull.rebase true

mkdir -p /home/node/.config/fish
cat <<EOF > /home/node/.config/fish/config.fish
set fish_greeting
set -gx FORCE_COLOR true
EOF

cd core && yarn
cd ../gateway && yarn
