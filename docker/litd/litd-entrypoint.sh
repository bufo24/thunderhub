#!/bin/sh
set -e

MACAROON_PATH="/root/.lit/regtest/super.macaroon"

# Start litd in the background
litd "$@" &
LITD_PID=$!

# Wait for litd to be ready
echo "Waiting for litd to start..."
until litcli --network=regtest getinfo >/dev/null 2>&1; do
  sleep 2
done

# Bake the super macaroon if it doesn't exist
if [ ! -f "$MACAROON_PATH" ]; then
  echo "Baking super macaroon with all LiT permissions (lnd + tapd + loop + pool)..."
  litcli --network=regtest bakesupermacaroon \
    --save_to="$MACAROON_PATH"
  echo "Super macaroon saved to $MACAROON_PATH"
else
  echo "Super macaroon already exists"
fi

# Wait for litd process
wait $LITD_PID
