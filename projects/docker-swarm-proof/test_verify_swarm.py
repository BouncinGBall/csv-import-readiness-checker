import argparse
import json
import os
import unittest

from verify_swarm import build_report


def node(node_id, hostname, role, *, state="ready", availability="active", leader=False, reachability=None):
    payload = {
        "ID": node_id,
        "Description": {"Hostname": hostname},
        "Spec": {"Role": role, "Availability": availability},
        "Status": {"State": state},
    }
    if role == "manager":
        payload["ManagerStatus"] = {
            "Leader": leader,
            "Reachability": reachability or "reachable",
        }
    return payload


HEALTHY_NODES = [
    node("m1", "manager-1", "manager", leader=True),
    node("m2", "manager-2", "manager"),
    node("m3", "manager-3", "manager"),
    node("w1", "worker-1", "worker"),
    node("w2", "worker-2", "worker"),
]


class FakeRunner:
    def __init__(self, nodes=None, service=None, task_states=None):
        self.nodes = nodes or HEALTHY_NODES
        self.service = service
        self.task_states = task_states or []

    def run(self, command):
        command = list(command)
        if command[:4] == ["docker", "node", "ls", "-q"]:
            return "\n".join(item["ID"] for item in self.nodes) + "\n"
        if command[:3] == ["docker", "node", "inspect"]:
            return json.dumps(self.nodes)
        if command[:3] == ["docker", "service", "inspect"]:
            return json.dumps([self.service])
        if command[:3] == ["docker", "service", "ps"]:
            return "\n".join(self.task_states) + "\n"
        raise AssertionError(f"Unexpected command: {command}")


def args(**overrides):
    values = {
        "expected_managers": 3,
        "expected_workers": 2,
        "service": [],
        "health_url": [],
        "health_ca_file": None,
        "registry_url": None,
        "registry_user": None,
        "registry_password_env": "REGISTRY_PASSWORD",
        "registry_ca_file": None,
    }
    values.update(overrides)
    return argparse.Namespace(**values)


class VerifySwarmTests(unittest.TestCase):
    def test_healthy_topology_passes(self):
        report = build_report(args(), runner=FakeRunner())
        self.assertTrue(report["passed"])
        self.assertEqual(len(report["nodes"]), 5)
        self.assertTrue(all(item["passed"] for item in report["checks"]))

    def test_unready_worker_fails(self):
        nodes = list(HEALTHY_NODES)
        nodes[-1] = node("w2", "worker-2", "worker", state="down")
        report = build_report(args(), runner=FakeRunner(nodes=nodes))
        self.assertFalse(report["passed"])
        failed = {item["name"] for item in report["checks"] if not item["passed"]}
        self.assertIn("nodes_ready_active", failed)

    def test_wrong_manager_count_fails(self):
        report = build_report(args(), runner=FakeRunner(nodes=[HEALTHY_NODES[0], HEALTHY_NODES[1], HEALTHY_NODES[3], HEALTHY_NODES[4]]))
        self.assertFalse(report["passed"])
        failed = {item["name"] for item in report["checks"] if not item["passed"]}
        self.assertIn("manager_count", failed)

    def test_replicated_service_passes_when_all_tasks_running(self):
        service = {"Spec": {"Mode": {"Replicated": {"Replicas": 3}}}}
        runner = FakeRunner(service=service, task_states=["Running 2 minutes", "Running 2 minutes", "Running 1 minute"])
        report = build_report(args(service=["proof_health"]), runner=runner)
        self.assertTrue(report["passed"])
        self.assertEqual(report["services"][0]["running_tasks"], 3)

    def test_replicated_service_fails_when_a_task_is_starting(self):
        service = {"Spec": {"Mode": {"Replicated": {"Replicas": 3}}}}
        runner = FakeRunner(service=service, task_states=["Running 2 minutes", "Running 1 minute", "Preparing 5 seconds"])
        report = build_report(args(service=["proof_health"]), runner=runner)
        self.assertFalse(report["passed"])
        self.assertFalse(next(item for item in report["checks"] if item["name"] == "service:proof_health")["passed"])

    def test_registry_auth_requires_password_environment_variable(self):
        environment_name = "FOXBOX_TEST_MISSING_REGISTRY_PASSWORD"
        os.environ.pop(environment_name, None)
        report = build_report(
            args(
                registry_url="https://registry.example.invalid",
                registry_user="acceptance",
                registry_password_env=environment_name,
            ),
            runner=FakeRunner(),
        )
        self.assertFalse(report["passed"])
        failed = {item["name"] for item in report["checks"] if not item["passed"]}
        self.assertIn("registry_credentials", failed)


if __name__ == "__main__":
    unittest.main()
