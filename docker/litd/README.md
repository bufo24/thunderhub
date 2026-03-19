# Litd + ThunderHub Docker Setup

Local development environment with Bitcoin Core (regtest), Lightning Terminal (litd), and ThunderHub.

## Quick Start

```bash
cd docker/litd
docker compose up --build
```

Wait for litd to finish initializing (watch logs for `"Server is starting"`), then open:

- **ThunderHub**: http://localhost:3000
- **Litd UI**: https://localhost:8443 (password: `testpassword123!`)

Log in to ThunderHub with password: `thunderhub`

## Services

| Service      | Port  | Description                          |
|-------------|-------|--------------------------------------|
| bitcoind    | 18443 | Bitcoin Core RPC (regtest)           |
| litd        | 10009 | LND gRPC (via litd)                 |
| litd        | 8080  | LND REST                            |
| litd        | 8443  | Lightning Terminal UI (HTTPS)        |
| litd        | 9735  | LND P2P                             |
| thunderhub  | 3000  | ThunderHub web UI                    |

## Generate Regtest Blocks

To fund the wallet and make the node usable:

```bash
# Generate initial blocks (need 100+ for coinbase maturity)
docker compose exec bitcoind bitcoin-cli -regtest -rpcuser=rpcuser -rpcpassword=rpcpassword generatetoaddress 110 $(docker compose exec litd lncli --network=regtest newaddress p2wkh | jq -r '.address')

# Generate more blocks later
docker compose exec bitcoind bitcoin-cli -regtest -rpcuser=rpcuser -rpcpassword=rpcpassword generatetoaddress 6 $(docker compose exec litd lncli --network=regtest newaddress p2wkh | jq -r '.address')
```

## Configuration

The ThunderHub account config is in `thubConfig.yaml`. It connects to litd using:
- **Type**: `litd` (uses the litd provider)
- **Connection mode**: `grpc` (socket + super macaroon)
- **Macaroon**: litd's super macaroon at `/data/litd/regtest/lit.macaroon`
- **Certificate**: litd's TLS cert at `/data/litd/tls.cert`

## Volumes

- `bitcoind-data` — Bitcoin Core regtest chain data
- `litd-data` — litd data (LND + tapd), shared read-only with thunderhub for macaroon/cert access

## Cleanup

```bash
docker compose down -v  # removes containers and volumes
```
