#!/usr/bin/env python3
"""Read-only acceptance verifier for a Docker Swarm delivery.

Run this on a Swarm manager after deployment. It records topology, manager
quorum signals, selected service replica state and optional HTTPS endpoints.
It never prints registry credentials or mutates the cluster.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence


class VerificationError(RuntimeError):
    """Raised when authoritative verification data cannot be collected."""


@dataclass(frozen=True)
class Check:
    name: str
    passed: bool
    detail: str
    observed: Any = None


class CommandRunner:
    def run(self, command: Sequence[str]) -> str:
        completed = subprocess.run(
            list(command),
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if completed.returncode != 0:
            error = completed.stderr.strip() or completed.stdout.strip() or "unknown docker error"
            raise VerificationError(f"Command failed ({' '.join(command[:3])}): {error}")
        return completed.stdout


def _load_json(raw: str, context: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise VerificationError(f"Invalid JSON from {context}: {exc}") from exc


def collect_nodes(runner: CommandRunner) -> list[dict[str, Any]]:
    node_ids = [line.strip() for line in runner.run(["docker", "node", "ls", "-q"]).splitlines() if line.strip()]
    if not node_ids:
        raise VerificationError("docker node ls returned no nodes; run on a Swarm manager")
    nodes = _load_json(runner.run(["docker", "node", "inspect", *node_ids]), "docker node inspect")
    if not isinstance(nodes, list) or not nodes:
        raise VerificationError("docker node inspect returned no node objects")
    return nodes


def node_summary(node: dict[str, Any]) -> dict[str, Any]:
    spec = node.get("Spec") or {}
    status = node.get("Status") or {}
    manager = node.get("ManagerStatus") or {}
    description = node.get("Description") or {}
    return {
        "id": str(node.get("ID") or "")[:12],
        "hostname": description.get("Hostname"),
        "role": str(spec.get("Role") or "").lower(),
        "availability": str(spec.get("Availability") or "").lower(),
        "state": str(status.get("State") or "").lower(),
        "manager_reachability": str(manager.get("Reachability") or "").lower() or None,
        "leader": bool(manager.get("Leader")),
    }


def verify_topology(
    nodes: Iterable[dict[str, Any]], expected_managers: int, expected_workers: int
) -> tuple[list[Check], list[dict[str, Any]]]:
    summaries = [node_summary(node) for node in nodes]
    managers = [node for node in summaries if node["role"] == "manager"]
    workers = [node for node in summaries if node["role"] == "worker"]
    unavailable = [
        node["hostname"]
        for node in summaries
        if node["state"] != "ready" or node["availability"] != "active"
    ]
    unreachable_managers = [
        node["hostname"] for node in managers if node["manager_reachability"] != "reachable"
    ]
    leaders = [node["hostname"] for node in managers if node["leader"]]

    checks = [
        Check(
            "manager_count",
            len(managers) == expected_managers,
            f"Expected {expected_managers} manager nodes",
            len(managers),
        ),
        Check(
            "worker_count",
            len(workers) == expected_workers,
            f"Expected {expected_workers} worker nodes",
            len(workers),
        ),
        Check(
            "nodes_ready_active",
            not unavailable,
            "Every node must be Ready and Active",
            unavailable,
        ),
        Check(
            "single_manager_leader",
            len(leaders) == 1,
            "Exactly one manager must report Leader=true",
            leaders,
        ),
        Check(
            "manager_reachability",
            not unreachable_managers,
            "Every manager must report Reachability=reachable",
            unreachable_managers,
        ),
    ]
    return checks, summaries


def verify_service(runner: CommandRunner, service_name: str) -> tuple[list[Check], dict[str, Any]]:
    payload = _load_json(
        runner.run(["docker", "service", "inspect", service_name]),
        f"docker service inspect {service_name}",
    )
    if not isinstance(payload, list) or len(payload) != 1:
        raise VerificationError(f"Expected exactly one service object for {service_name}")

    service = payload[0]
    spec = service.get("Spec") or {}
    mode = spec.get("Mode") or {}
    replicated = mode.get("Replicated")
    desired = int((replicated or {}).get("Replicas") or 0) if replicated is not None else None
    task_states = [
        line.strip()
        for line in runner.run(
            [
                "docker",
                "service",
                "ps",
                service_name,
                "--filter",
                "desired-state=running",
                "--format",
                "{{.CurrentState}}",
            ]
        ).splitlines()
        if line.strip()
    ]
    running = sum(state.lower().startswith("running") for state in task_states)
    mode_name = "replicated" if desired is not None else "global"
    expected_running = desired if desired is not None else max(1, len(task_states))
    passed = running == expected_running if desired is not None else running > 0 and running == len(task_states)

    summary = {
        "name": service_name,
        "mode": mode_name,
        "desired_replicas": desired,
        "running_tasks": running,
        "task_states": task_states,
    }
    return [
        Check(
            f"service:{service_name}",
            passed,
            "All desired service tasks must be running",
            summary,
        )
    ], summary


def verify_https(
    name: str,
    url: str,
    username: str | None = None,
    password: str | None = None,
    ca_file: str | None = None,
    timeout_seconds: float = 10.0,
) -> tuple[Check, dict[str, Any]]:
    request = urllib.request.Request(url, method="GET")
    if username is not None and password is not None:
        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
        request.add_header("Authorization", f"Basic {token}")
    ssl_context = ssl.create_default_context(cafile=ca_file) if ca_file else None
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds, context=ssl_context) as response:
            status = int(response.status)
            final_url = response.geturl()
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        final_url = exc.geturl()
    except (urllib.error.URLError, TimeoutError) as exc:
        evidence = {"url": url, "error": str(exc.reason if isinstance(exc, urllib.error.URLError) else exc)}
        return Check(name, False, "HTTPS request failed", evidence), evidence

    evidence = {"url": url, "final_url": final_url, "status": status}
    return Check(name, 200 <= status < 300, "Endpoint must return HTTP 2xx", evidence), evidence


def build_report(args: argparse.Namespace, runner: CommandRunner | None = None) -> dict[str, Any]:
    runner = runner or CommandRunner()
    nodes = collect_nodes(runner)
    checks, node_summaries = verify_topology(nodes, args.expected_managers, args.expected_workers)

    service_summaries: list[dict[str, Any]] = []
    for service_name in args.service:
        service_checks, summary = verify_service(runner, service_name)
        checks.extend(service_checks)
        service_summaries.append(summary)

    endpoint_summaries: list[dict[str, Any]] = []
    for index, health_url in enumerate(args.health_url, start=1):
        check, summary = verify_https(
            f"health_endpoint:{index}", health_url, ca_file=args.health_ca_file
        )
        checks.append(check)
        endpoint_summaries.append(summary)

    if args.registry_url:
        registry_url = args.registry_url.rstrip("/") + "/v2/"
        password = None
        if args.registry_user:
            password = os.environ.get(args.registry_password_env)
            if password is None:
                checks.append(
                    Check(
                        "registry_credentials",
                        False,
                        f"Environment variable {args.registry_password_env} is required",
                    )
                )
            else:
                check, summary = verify_https(
                    "registry_https_auth",
                    registry_url,
                    args.registry_user,
                    password,
                    ca_file=args.registry_ca_file,
                )
                checks.append(check)
                endpoint_summaries.append(summary)
        else:
            check, summary = verify_https(
                "registry_https", registry_url, ca_file=args.registry_ca_file
            )
            checks.append(check)
            endpoint_summaries.append(summary)

    return {
        "schema_version": 1,
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "passed": all(check.passed for check in checks),
        "conditions": {
            "expected_managers": args.expected_managers,
            "expected_workers": args.expected_workers,
            "read_only": True,
        },
        "nodes": node_summaries,
        "services": service_summaries,
        "endpoints": endpoint_summaries,
        "checks": [asdict(check) for check in checks],
    }


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify Docker Swarm acceptance signals without changing the cluster")
    parser.add_argument("--expected-managers", type=int, default=3)
    parser.add_argument("--expected-workers", type=int, default=2)
    parser.add_argument("--service", action="append", default=[], help="Service name to verify; repeat as needed")
    parser.add_argument("--health-url", action="append", default=[], help="HTTPS health URL; repeat as needed")
    parser.add_argument("--health-ca-file", help="Optional CA bundle for health endpoints")
    parser.add_argument("--registry-url", help="Registry base URL; /v2/ is appended")
    parser.add_argument("--registry-user", help="Registry basic-auth username")
    parser.add_argument("--registry-password-env", default="REGISTRY_PASSWORD")
    parser.add_argument("--registry-ca-file", help="Optional CA bundle for Registry TLS")
    parser.add_argument("--output", default="swarm-verification-report.json")
    args = parser.parse_args(argv)
    if args.expected_managers < 1 or args.expected_workers < 0:
        parser.error("expected node counts must be non-negative and managers must be at least 1")
    return args


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        report = build_report(args)
    except VerificationError as exc:
        report = {
            "schema_version": 1,
            "measured_at": datetime.now(timezone.utc).isoformat(),
            "passed": False,
            "runtime_error": str(exc),
            "checks": [],
        }
        exit_code = 1
    else:
        exit_code = 0 if report["passed"] else 2

    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    Path(args.output).write_text(output, encoding="utf-8")
    sys.stdout.write(output)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
