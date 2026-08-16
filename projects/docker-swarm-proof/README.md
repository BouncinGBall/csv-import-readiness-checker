# Controlled Docker Swarm proof lab

> Controlled local process proof, not a client case and not evidence about a third-party production environment.

This reproducible lab creates five isolated Docker-in-Docker nodes, forms a
three-manager/two-worker Swarm, deploys a three-replica health service and an
authenticated TLS Registry, tests worker and follower-manager loss, and then
runs a read-only acceptance verifier again after recovery.

## Requirements and safety boundary

- Windows PowerShell, Docker Desktop with Linux containers, and Python 3.
- About 4 GB of free memory for five nested Docker daemons.
- The lab binds its Docker API and test endpoints to `127.0.0.1` only.
- Runtime CA keys, Registry keys, htpasswd data, join tokens, and a fresh random
  Registry password are generated locally. They are never included in evidence.
- `-Reset` removes only the Compose project named `foxbox-swarm-proof` and its
  lab volumes. It does not touch unrelated Docker resources.

## Run

From this directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run-lab.ps1 -Reset
```

The script writes new machine evidence to `results/`. The checked-in evidence
under `evidence/` is the recorded run published on 16 August 2026.

## Inspect before running

- `docker-compose.yml` — five isolated lab nodes and loopback-only host ports.
- `stack.yml` — health service, Registry, placement, update and restart policy.
- `run-lab.ps1` — setup, bounded fault injection, recovery and evidence capture.
- `verify_swarm.py` — read-only topology, service and endpoint acceptance checks.
- `test_verify_swarm.py` — six unit tests for verifier pass/fail behavior.
- `BENCHMARK_SUMMARY.md` and `evidence/` — result summary and raw public evidence.
- `SHA256SUMS.txt` — integrity hashes for the published evidence files.

Run the verifier unit tests without Docker:

```powershell
python -m unittest -v .\test_verify_swarm.py
```

## Cleanup

```powershell
docker compose -f .\docker-compose.yml down --volumes --remove-orphans
```

Runtime certificates and locally generated results remain on disk so they can
be inspected. Delete those local folders separately only after review.
