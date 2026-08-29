#!/usr/bin/env bash

set -euo pipefail

deploy_directory=${1:-}
result_directory=${2:-}
source_policy=${3:-}

if [[ -z "$deploy_directory" || -z "$result_directory" || "$deploy_directory" == "/" || "$result_directory" == "/" || ( -n "$source_policy" && "$source_policy" != "--keep-source" ) ]]; then
    echo "Usage: deploy-scoped.sh <deploy-directory> <result-directory> [--keep-source]" >&2
    exit 1
fi

if [[ -d "$deploy_directory/tests" ]]; then
    echo "Refusing to scope a release source that contains test function stubs: $deploy_directory/tests" >&2
    exit 1
fi

rm -rf "$result_directory"
rm -rf "$deploy_directory/deploy/php-scoper-wordpress-excludes-master"

curl --fail --location --silent --show-error \
    https://github.com/snicco/php-scoper-wordpress-excludes/archive/refs/heads/master.zip \
    --output php-scoper-wordpress-excludes-master.zip
unzip -q php-scoper-wordpress-excludes-master.zip -d "$deploy_directory/deploy"
rm -f php-scoper-wordpress-excludes-master.zip

curl --fail --location --silent --show-error \
    https://github.com/humbug/php-scoper/releases/download/0.18.19/php-scoper.phar \
    --output php-scoper.phar

php -d memory_limit=-1 php-scoper.phar add-prefix \
    --output-dir "../$result_directory" \
    --config deploy/scoper.inc.php \
    --force \
    --ansi \
    --working-dir "$deploy_directory"

rm -f php-scoper.phar "$result_directory/php-scoper.phar"
composer dump-autoload --working-dir "$result_directory" --ansi --no-dev --classmap-authoritative

if [[ -f deploy/patch-scoper-autoload.php ]]; then
    php deploy/patch-scoper-autoload.php "$result_directory/vendor/scoper-autoload.php"
fi

if grep -Fq 'WindPressDeps\dbDelta' "$result_directory/vendor/scoper-autoload.php"; then
    echo "The scoped autoloader contains a broken dbDelta() proxy." >&2
    exit 1
fi

rm -rf "$deploy_directory/deploy/php-scoper-wordpress-excludes-master"

if [[ "$source_policy" != "--keep-source" ]]; then
    rm -rf "$deploy_directory"
fi
