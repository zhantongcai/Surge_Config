#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
TEMPLATE_FILE="${ROOT_DIR}/Steve_WgetCloud_AI_Smart.conf"
OUTPUT_DIR="${ROOT_DIR}/private"
OUTPUT_FILE="${OUTPUT_DIR}/Steve_WgetCloud_AI_Private.conf"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env. Copy .env.example to .env and fill your private values." >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

: "${SURGE_SUBSCRIPTION_URL:?Missing SURGE_SUBSCRIPTION_URL in .env}"
: "${SURGE_PRIVATE_PROFILE_URL:?Missing SURGE_PRIVATE_PROFILE_URL in .env}"

SURGE_MANAGED_INTERVAL="${SURGE_MANAGED_INTERVAL:-21600}"

mkdir -p "${OUTPUT_DIR}"

{
  printf '#!MANAGED-CONFIG %s interval=%s strict=false\n' "${SURGE_PRIVATE_PROFILE_URL}" "${SURGE_MANAGED_INTERVAL}"
  awk 'NR == 1 && /^#!MANAGED-CONFIG / {next} {print}' "${TEMPLATE_FILE}" |
    sed "s#policy-path=输入你的订阅链接#policy-path=${SURGE_SUBSCRIPTION_URL}#g"
} > "${OUTPUT_FILE}"

echo "Generated: ${OUTPUT_FILE}"
echo "Managed URL: ${SURGE_PRIVATE_PROFILE_URL}"
