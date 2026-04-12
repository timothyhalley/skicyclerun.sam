#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

STACK_NAME=""
AWS_PROFILE_ARG=""
AWS_REGION_ARG=""
CODE_VALUE="123456"
PHONE_NUMBER="+15555550123"
TRIGGER_SOURCE="CustomSMSSender_Authentication"
SKIP_BUILD="false"
KMS_ONLY="false"

usage() {
  cat <<EOF
Usage: ./kms_test.sh [options]

Repeatable local positive test for CustomSmsSender KMS decrypt handshake.

Options:
  --stack-name <name>      CloudFormation stack name (default: from samconfig.toml)
  --profile <name>         AWS profile (default: from samconfig.toml or AWS_PROFILE)
  --region <region>        AWS region (default: from samconfig.toml or AWS_REGION)
  --code <value>           Verification code plaintext to encrypt (default: 123456)
  --phone <e164>           Destination phone number in event (default: +15555550123)
  --trigger <source>       Cognito trigger source (default: CustomSMSSender_Authentication)
  --skip-build             Skip "sam build CustomSmsSenderFunction"
  --kms-only               Verify KMS encrypt/decrypt only, skip SAM local invoke
  --help                   Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    --profile)
      AWS_PROFILE_ARG="$2"
      shift 2
      ;;
    --region)
      AWS_REGION_ARG="$2"
      shift 2
      ;;
    --code)
      CODE_VALUE="$2"
      shift 2
      ;;
    --phone)
      PHONE_NUMBER="$2"
      shift 2
      ;;
    --trigger)
      TRIGGER_SOURCE="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift 1
      ;;
    --kms-only)
      KMS_ONLY="true"
      shift 1
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd aws
require_cmd sam

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Install Docker Desktop first."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and retry."
  exit 1
fi

extract_from_samconfig() {
  local key="$1"
  awk -F'=' -v k="$key" '
    $1 ~ "^[[:space:]]*"k"[[:space:]]*$" {
      val=$2
      sub(/^[[:space:]]*/, "", val)
      sub(/[[:space:]]*$/, "", val)
      gsub(/^"|"$/, "", val)
      print val
      exit
    }
  ' samconfig.toml
}

if [[ -z "$STACK_NAME" ]]; then
  STACK_NAME="$(extract_from_samconfig "stack_name")"
fi

if [[ -z "$AWS_REGION_ARG" ]]; then
  AWS_REGION_ARG="$(extract_from_samconfig "region")"
fi

if [[ -z "$AWS_PROFILE_ARG" ]]; then
  AWS_PROFILE_ARG="$(extract_from_samconfig "profile")"
fi

if [[ -z "$AWS_REGION_ARG" ]]; then
  AWS_REGION_ARG="${AWS_REGION:-us-west-2}"
fi

if [[ -z "$STACK_NAME" ]]; then
  echo "Could not determine stack name. Pass --stack-name."
  exit 1
fi

AWS_ARGS=(--region "$AWS_REGION_ARG")
if [[ -n "$AWS_PROFILE_ARG" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE_ARG")
fi

cf_param() {
  local key="$1"
  aws "${AWS_ARGS[@]}" cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Parameters[?ParameterKey=='$key'].ParameterValue | [0]" \
    --output text
}

KEY_ARN="$(cf_param "CognitoCustomSenderKmsKeyArn")"
USER_POOL_ARN="$(cf_param "UserPoolArn")"
NOTIFY_CONFIGURATION_ID="$(cf_param "NotifyConfigurationId")"
NOTIFY_TEMPLATE_DEFAULT_ID="$(cf_param "NotifyTemplateDefaultId")"
NOTIFY_BRAND_NAME="$(cf_param "NotifyBrandName")"
NOTIFY_CODE_TTL_MINUTES="$(cf_param "NotifyCodeTtlMinutes")"

if [[ "$KEY_ARN" == "None" || -z "$KEY_ARN" ]]; then
  echo "Could not resolve CognitoCustomSenderKmsKeyArn from stack parameters."
  exit 1
fi

if [[ "$USER_POOL_ARN" == "None" || -z "$USER_POOL_ARN" ]]; then
  echo "Could not resolve UserPoolArn from stack parameters."
  exit 1
fi

USER_POOL_ID="${USER_POOL_ARN##*/}"

if [[ "$NOTIFY_CONFIGURATION_ID" == "None" || -z "$NOTIFY_CONFIGURATION_ID" ]]; then
  NOTIFY_CONFIGURATION_ID="cfg-local"
fi

if [[ "$NOTIFY_TEMPLATE_DEFAULT_ID" == "None" || -z "$NOTIFY_TEMPLATE_DEFAULT_ID" ]]; then
  NOTIFY_TEMPLATE_DEFAULT_ID="tmpl-local"
fi

if [[ "$NOTIFY_BRAND_NAME" == "None" || -z "$NOTIFY_BRAND_NAME" ]]; then
  NOTIFY_BRAND_NAME="skicyclerun"
fi

if [[ "$NOTIFY_CODE_TTL_MINUTES" == "None" || -z "$NOTIFY_CODE_TTL_MINUTES" ]]; then
  NOTIFY_CODE_TTL_MINUTES="5"
fi

echo "Resolved values:"
echo "  STACK_NAME=$STACK_NAME"
echo "  AWS_REGION=$AWS_REGION_ARG"
echo "  AWS_PROFILE=${AWS_PROFILE_ARG:-<default>}"
echo "  KEY_ARN=$KEY_ARN"
echo "  USER_POOL_ID=$USER_POOL_ID"

PLAINTEXT_FILE="$(mktemp)"
cleanup() {
  rm -f "$PLAINTEXT_FILE"
}
trap cleanup EXIT
printf '%s' "$CODE_VALUE" > "$PLAINTEXT_FILE"

CIPHERTEXT_B64="$(aws "${AWS_ARGS[@]}" kms encrypt \
  --key-id "$KEY_ARN" \
  --plaintext "fileb://$PLAINTEXT_FILE" \
  --encryption-context "userpool-id=$USER_POOL_ID" \
  --query CiphertextBlob \
  --output text)"

if [[ -z "$CIPHERTEXT_B64" ]]; then
  echo "Failed to generate ciphertext."
  exit 1
fi

EVENT_FILE="events/CustomSmsSender.positive.generated.json"
ENV_FILE="events/CustomSmsSender.env.generated.json"

cat > "$EVENT_FILE" <<EOF
{
  "triggerSource": "$TRIGGER_SOURCE",
  "userPoolId": "$USER_POOL_ID",
  "userName": "kms-local-test-user",
  "request": {
    "code": "$CIPHERTEXT_B64",
    "userAttributes": {
      "phone_number": "$PHONE_NUMBER"
    }
  }
}
EOF

cat > "$ENV_FILE" <<EOF
{
  "CustomSmsSenderFunction": {
    "NOTIFY_CONFIGURATION_ID": "$NOTIFY_CONFIGURATION_ID",
    "NOTIFY_TEMPLATE_DEFAULT_ID": "$NOTIFY_TEMPLATE_DEFAULT_ID",
    "NOTIFY_BRAND_NAME": "$NOTIFY_BRAND_NAME",
    "NOTIFY_CODE_TTL_MINUTES": "$NOTIFY_CODE_TTL_MINUTES",
    "COGNITO_CUSTOM_SENDER_KMS_KEY_ARN": "$KEY_ARN"
  }
}
EOF

echo "Generated files:"
echo "  $EVENT_FILE"
echo "  $ENV_FILE"

echo "Verifying KMS decrypt with required encryption context..."
DECRYPTED_CODE="$(aws "${AWS_ARGS[@]}" kms decrypt \
  --ciphertext-blob "$CIPHERTEXT_B64" \
  --encryption-context "userpool-id=$USER_POOL_ID" \
  --query Plaintext \
  --output text | base64 --decode)"

if [[ "$DECRYPTED_CODE" != "$CODE_VALUE" ]]; then
  echo "KMS decrypt verification failed: expected '$CODE_VALUE' but got '$DECRYPTED_CODE'"
  exit 1
fi

echo "KMS decrypt verification passed."

if [[ "$KMS_ONLY" == "true" ]]; then
  echo "KMS-only mode enabled; skipping SAM local invoke."
  exit 0
fi

if [[ "$SKIP_BUILD" != "true" ]]; then
  sam build CustomSmsSenderFunction
fi

sam local invoke CustomSmsSenderFunction --event "$EVENT_FILE" --env-vars "$ENV_FILE"