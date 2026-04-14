#!/bin/bash

set -euo pipefail

PROFILE="${AWS_PROFILE:-skicyclerun_prd}"
REGION="${AWS_REGION:-us-west-2}"
STACK_NAME="${STACK_NAME:-skicyclerunAPI-v3}"
PHONE_NUMBER="${PHONE_NUMBER:-+14252958989}"
SINCE_WINDOW="${SINCE_WINDOW:-15m}"
TRIGGER_REQUEST=1
FOLLOW_LOGS=1
VERIFY_OTP=""

usage() {
  cat <<'EOF'
Usage: ./debug-sms-auth.sh [options]

Options:
  --phone <e164>         Phone number to test. Default: +14252958989
  --stack <name>         CloudFormation stack name. Default: skicyclerunAPI-v3
  --profile <name>       AWS profile. Default: skicyclerun_prd
  --region <name>        AWS region. Default: us-west-2
  --since <window>       Log tail window. Default: 15m
  --otp <code>           After send, also call verify-otp with this code.
  --no-trigger           Do not send the SMS OTP request.
  --no-follow            Print config only; do not tail logs.
  --help                 Show this help text.

Environment overrides:
  AWS_PROFILE, AWS_REGION, STACK_NAME, PHONE_NUMBER, SINCE_WINDOW
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phone)        PHONE_NUMBER="$2"; shift 2 ;;
    --stack)        STACK_NAME="$2";   shift 2 ;;
    --profile)      PROFILE="$2";      shift 2 ;;
    --region)       REGION="$2";       shift 2 ;;
    --since)        SINCE_WINDOW="$2"; shift 2 ;;
    --otp)          VERIFY_OTP="$2";   shift 2 ;;
    --no-trigger)   TRIGGER_REQUEST=0; shift   ;;
    --no-follow)    FOLLOW_LOGS=0;     shift   ;;
    --help)         usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

aws_cmd() {
  aws --profile "$PROFILE" --region "$REGION" "$@"
}

echo "=== SMS Auth Debug Context ==="
echo "PROFILE=$PROFILE"
echo "REGION=$REGION"
echo "STACK_NAME=$STACK_NAME"
echo "PHONE_NUMBER=$PHONE_NUMBER"
echo "SINCE_WINDOW=$SINCE_WINDOW"
echo ""

BASE_URL=$(aws_cmd cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='PublicApiBaseUrl'].OutputValue | [0]" \
  --output text)

AUTH_FN=$(aws_cmd cloudformation describe-stack-resource \
  --stack-name "$STACK_NAME" \
  --logical-resource-id NotifyAuthFunction \
  --query 'StackResourceDetail.PhysicalResourceId' \
  --output text)

echo "BASE_URL=$BASE_URL"
echo "AUTH_FN=$AUTH_FN"
echo ""

echo "=== NotifyAuthFunction Config ==="
aws_cmd lambda get-function-configuration \
  --function-name "$AUTH_FN" \
  --query '{FunctionName:FunctionName,Runtime:Runtime,Timeout:Timeout,LastModified:LastModified,EnvVars:Environment.Variables}' \
  --output json
echo ""

echo "=== Notify Configuration Set ==="
aws_cmd pinpoint-sms-voice-v2 describe-configuration-sets \
  --configuration-set-names notify-96a1d17ccf3c4a408504252774c9ff6e \
  --query 'ConfigurationSets[0].{Name:ConfigurationSetName,DefaultSenderId:DefaultSenderId}' \
  --output json 2>/dev/null || echo "WARNING: Could not describe Notify configuration set notify-96a1d17ccf3c4a408504252774c9ff6e"
echo ""

AUTH_LOG_GROUP="/aws/lambda/$AUTH_FN"

cleanup() {
  if [[ -n "${AUTH_TAIL_PID:-}" ]]; then
    kill "$AUTH_TAIL_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if [[ $FOLLOW_LOGS -eq 1 ]]; then
  echo "=== Tailing NotifyAuthFunction Logs: $AUTH_LOG_GROUP ==="
  aws_cmd logs tail "$AUTH_LOG_GROUP" --since "$SINCE_WINDOW" --format short --follow &
  AUTH_TAIL_PID=$!
  sleep 2
fi

if [[ $TRIGGER_REQUEST -eq 1 ]]; then
  echo ""
  echo "=== Triggering SMS OTP Send ==="
  curl -i -X POST "$BASE_URL/v2/auth/send-otp" \
    -H 'content-type: application/json' \
    --data "{\"phoneNumber\":\"$PHONE_NUMBER\"}"
  echo ""

  if [[ -n "$VERIFY_OTP" ]]; then
    echo ""
    echo "=== Verifying OTP: $VERIFY_OTP ==="
    curl -i -X POST "$BASE_URL/v2/auth/verify-otp" \
      -H 'content-type: application/json' \
      --data "{\"phoneNumber\":\"$PHONE_NUMBER\",\"otp\":\"$VERIFY_OTP\"}"
    echo ""
  fi
fi

if [[ $FOLLOW_LOGS -eq 1 ]]; then
  echo ""
  echo "Watching logs. Press Ctrl+C to stop."
  wait
fi