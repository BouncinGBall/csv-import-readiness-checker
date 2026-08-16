# Fox Box controlled Docker Swarm proof lab

> Controlled local process proof, not a client case and not evidence about a third-party production environment.

Baseline gate: **PASS**.
Recovered-state gate: **PASS**.

- Five isolated Docker-in-Docker nodes: three managers and two workers.
- Three replicated Nginx health tasks scheduled only on workers.
- Registry 2 deployed as a Swarm service with CA-signed TLS and bcrypt htpasswd authentication.
- HTTP service remained available after one worker stopped and tasks converged on the remaining worker.
- The leader continued listing services and serving traffic while one follower-manager was stopped.
- Both stopped nodes returned to Ready and the complete read-only verifier passed again.

Use only as process proof. A funded client environment requires its own baseline, storage decision, firewall matrix and approved failover window.
