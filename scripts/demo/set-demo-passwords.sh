#!/usr/bin/env bash
# Sets the password of each Brand New Day demo account on the staging server. Run it in your own terminal.
#
#   bash scripts/demo/set-demo-passwords.sh                      # type each password at a hidden prompt
#   bash scripts/demo/set-demo-passwords.sh --from-env NAME      # use the value of NAME from the local .env
#
# With --from-env the password is read from .env here, on your machine, and sent to the server over ssh on standard
# input: it never appears in a command line, a log or a chat. One password is used for all four accounts.
#
# Optional: [ssh-target] [container] as the last two arguments (defaults are the staging server).
set -euo pipefail
cd "$(dirname "$0")/../.."

FROM_ENV=""
if [[ "${1:-}" == "--from-env" ]]; then
  FROM_ENV="${2:?Name the .env variable, for example: --from-env Password_to_use}"
  shift 2
fi
TARGET="${1:-root@72.61.197.194}"
APP="${2:-dmhub-affiliates-bd-jxylc1-app-1}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
ACCOUNTS=(bnd.adviseur creator vergelijker cashback)

if [[ -z "$FROM_ENV" ]]; then
  for name in "${ACCOUNTS[@]}"; do
    echo
    echo "== ${name}@demo.dmhub.cloud"
    ssh -t -i "$KEY" "$TARGET" "docker exec -it $APP php artisan demo:set-password ${name}@demo.dmhub.cloud --force"
  done
  exit 0
fi

# Read the value without echoing it: first matching line, text after the first "=", surrounding quotes removed.
PASSWORD="$(grep -E "^${FROM_ENV}=" .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "$PASSWORD" ]]; then
  echo "No value found for ${FROM_ENV} in .env" >&2
  exit 1
fi
if [[ ${#PASSWORD} -lt 12 ]]; then
  echo "${FROM_ENV} is shorter than 12 characters; choose a longer one." >&2
  exit 1
fi

# Runs on the server: reads the password from standard input and sets it on one demo account.
read -r -d '' REMOTE_PHP <<'PHP' || true
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$email = $argv[1] ?? "";
$password = rtrim((string) fgets(STDIN), "\r\n");
if (! str_ends_with(strtolower($email), "@demo.dmhub.cloud") || strlen($password) < 12) {
    fwrite(STDERR, "refused: not a demo account, or the password is shorter than 12 characters\n");
    exit(1);
}
$changed = App\Models\User::where("email", $email)->update(["password" => Illuminate\Support\Facades\Hash::make($password)]);
echo $changed ? "password set for {$email}\n" : "no such account: {$email} (run demo:bnd first)\n";
exit($changed ? 0 : 1);
PHP
ENCODED="$(printf '%s' "$REMOTE_PHP" | base64 | tr -d '\n')"

for name in "${ACCOUNTS[@]}"; do
  printf '%s\n' "$PASSWORD" | ssh -i "$KEY" "$TARGET" "docker exec -i $APP sh -c 'php -r \"\$(echo $ENCODED | base64 -d)\" ${name}@demo.dmhub.cloud'"
done
unset PASSWORD
