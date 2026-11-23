#!/usr/bin/env bash
# Run this in your own terminal (it needs one): you type each password at a hidden prompt, so it never appears in a
# command line, a log or a chat. It sets the password of each Brand New Day demo account on the staging server.
#
#   bash scripts/demo/set-demo-passwords.sh [ssh-target] [container]
#
set -euo pipefail
TARGET="${1:-root@72.61.197.194}"
APP="${2:-dmhub-affiliates-bd-jxylc1-app-1}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"

for email in bnd.adviseur creator vergelijker cashback; do
  echo
  echo "== ${email}@demo.dmhub.cloud"
  ssh -t -i "$KEY" "$TARGET" "docker exec -it $APP php artisan demo:set-password ${email}@demo.dmhub.cloud --force"
done
