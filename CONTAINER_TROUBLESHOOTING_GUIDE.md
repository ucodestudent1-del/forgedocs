# Container Crash Troubleshooting Guide

A comprehensive, systematic guide for diagnosing and resolving container crashes across all failure categories.

---

## Table of Contents

1. [Resource Exhaustion](#resource-exhaustion)
2. [Application-Level Errors](#application-level-errors)
3. [Configuration and Environment Issues](#configuration-and-environment-issues)
4. [Orchestration and Health Check Failures](#orchestration-and-health-check-failures)
5. [Universal Diagnostic Checklist](#universal-diagnostic-checklist)
6. [Common Error Codes Reference](#common-error-codes-reference)

---

## 1. Resource Exhaustion

Resource exhaustion occurs when a container consumes more system resources than allocated, leading to kernel-level kills or performance degradation.

### 1.1 Out of Memory (OOM) Kill

**Symptoms:**
- Container exits with code 137 (SIGKILL)
- `dmesg` shows "Out of memory: Kill process"
- Container restarts in a crash loop

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker ps -a` | Container status showing "Exited (137)" or "OOMKilled" |
| 2 | `docker inspect <container_id> --format='{{.State.OOMKilled}}'` | `true` confirms OOM kill |
| 3 | `docker logs <container_id>` | "Out of memory" messages, process termination |
| 4 | `dmesg \| grep -i oom` | Kernel OOM killer messages on host |
| 5 | `docker stats <container_id>` | Memory usage approaching limit before crash |

**Resolution:**
- Increase container memory limit: `docker run -m 2g <image>`
- Optimize application memory usage (reduce heap size, close connections)
- Add swap space on host: `sudo fallocate -l 2G /swapfile`

### 1.2 CPU Throttling

**Symptoms:**
- Container runs slowly but doesn't crash
- High CPU usage with low throughput
- Request timeouts under load

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker stats <container_id>` | CPU% consistently near limit |
| 2 | `docker inspect <container_id> --format='{{.HostConfig.CpuQuota}}'` | CPU quota value |
| 3 | `docker inspect <container_id> --format='{{.HostConfig.CpuPeriod}}'` | CPU period (typically 100000) |
| 4 | `top -p $(docker inspect -f '{{.State.Pid}}' <container_id>)` | Process CPU usage on host |
| 5 | `docker events --filter container=<container_id>` | Throttle events |

**Resolution:**
- Increase CPU limit: `docker run --cpus=2 <image>`
- Remove CPU limit: `docker run --cpus=-1 <image>`
- Optimize application code for CPU efficiency

### 1.3 Disk Space Exhaustion

**Symptoms:**
- Container fails to write logs or temp files
- Build failures during `npm install` or similar
- Application errors writing temporary data

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker system df` | Disk usage by images, containers, volumes |
| 2 | `docker system df -v` | Detailed breakdown per image/container |
| 3 | `docker inspect <container_id> --format='{{.GraphDriver.Data.UpperDir}}'` | Container writable layer location |
| 4 | `df -h <container_mount_point>` | Host disk usage at container mount |
| 5 | `docker system prune -n` | See how much space can be reclaimed |

**Resolution:**
- `docker system prune -a` (remove unused images, containers, networks)
- Increase container storage: `docker run --storage-opt size=20G <image>`
- Mount external volume for application data

---

## 2. Application-Level Errors

Application-level errors occur when the application code fails at runtime, causing the container process to exit.

### 2.1 Missing Module or Dependency

**Symptoms:**
- Container exits immediately with code 1
- Error: "Cannot find module" or "module not found"
- Works locally but fails in container

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker logs <container_id>` | "Cannot find module" error message |
| 2 | `docker run --rm -it <image> sh` | Interactive shell in container |
| 3 | `ls node_modules/` (Node.js) or `ls site-packages/` (Python) | Check if dependencies installed |
| 4 | `npm ls` or `pip list` | Verify package versions |
| 5 | `docker build --no-cache .` | Rebuild without cache to catch stale layers |

**Resolution:**
- Ensure `package.json`/`requirements.txt` lists all dependencies
- Run `npm install`/`pip install` during build, not at runtime
- Use multi-stage builds to separate build and runtime dependencies

### 2.2 Syntax or Import Errors

**Symptoms:**
- Container exits immediately with code 1
- "SyntaxError", "ImportError", "ModuleNotFoundError"
- Works in development but fails in production

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker logs <container_id>` | Full stack trace with line numbers |
| 2 | `docker run --rm -it <image> node -e "require('./app.js')"` | Test module loading directly |
| 3 | `docker run --rm -it <image> python -c "import app"` | Test Python module loading |
| 4 | Compare `package.json`/`requirements.txt` between dev and prod | Version mismatches |
| 5 | Check `.dockerignore` for accidentally excluded files | Missing source files |

**Resolution:**
- Ensure all dependencies are listed in lock files
- Use consistent Node.js/Python versions (specify in Dockerfile)
- Check `.dockerignore` isn't excluding necessary files

### 2.3 Unhandled Exceptions

**Symptoms:**
- Container crashes intermittently
- Error logs before exit
- Works for some requests but crashes on others

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker logs <container_id>` | Full exception stack trace |
| 2 | `docker logs <container_id> --tail 100` | Recent errors before crash |
| 3 | `docker inspect <container_id> --format='{{.State.ExitCode}}'` | Non-zero exit code |
| 4 | `docker events --filter container=<container_id>` | Crash frequency pattern |
| 5 | Run locally with same data/input | Reproduce locally |

**Resolution:**
- Add try/catch blocks around risky operations
- Add input validation for all user-provided data
- Implement graceful degradation for external service failures

---

## 3. Configuration and Environment Issues

Configuration issues occur when the container lacks required environment variables, has incorrect entrypoints, or cannot access required volumes.

### 3.1 Missing Environment Variables

**Symptoms:**
- Container exits immediately with configuration error
- "Missing required environment variable" messages
- Application starts but fails on first request

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker logs <container_id>` | "Missing env var" error messages |
| 2 | `docker inspect <container_id> --format='{{.Config.Env}}'` | List of configured env vars |
| 3 | `docker run --rm <image> env` | All environment variables in container |
| 4 | `docker compose config` | Verify compose file env var substitution |
| 5 | Check `.env` file exists and is loaded | File presence and contents |

**Resolution:**
- Define all required env vars in `docker run -e` or `docker-compose.yml`
- Use `.env` file with `docker-compose --env-file`
- Provide sensible defaults in application code

### 3.2 Incorrect Entrypoint or Command

**Symptoms:**
- Container exits immediately with "command not found"
- `docker run` starts but application doesn't launch
- Wrong process runs instead of application

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker inspect <container_id> --format='{{.Config.Entrypoint}}'` | Entrypoint configuration |
| 2 | `docker inspect <container_id> --format='{{.Config.Cmd}}'` | Command configuration |
| 3 | `docker inspect <container_id> --format='{{.Config.WorkingDir}}'` | Working directory |
| 4 | `docker run --rm -it <image> ls -la` | Check files exist at WORKDIR |
| 5 | `docker run --rm <image> which node` | Verify binary exists in PATH |

**Resolution:**
- Ensure `ENTRYPOINT` and `CMD` in Dockerfile are correct
- Verify WORKDIR matches application location
- Use absolute paths for binaries: `/usr/local/bin/node` instead of `node`

### 3.3 Volume Mount Failures

**Symptoms:**
- Application can't read/write expected files
- Empty directories where data should be
- Permission denied errors on mounted files

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker inspect <container_id> --format='{{.Mounts}}'` | List of mounted volumes |
| 2 | `docker run --rm -it <image> ls -la /app/data` | Check mounted directory contents |
| 3 | `ls -la /host/data` | Verify host directory has files |
| 4 | `docker run --rm -it <image> touch /app/data/test` | Test write permissions |
| 5 | Check SELinux/AppArmor contexts on host | Security context blocking access |

**Resolution:**
- Use absolute paths for volume mounts: `/host/data:/container/data`
- Ensure host directory exists before mounting
- Fix file permissions: `chmod -R 755 /host/data`

### 3.4 Wrong Working Directory

**Symptoms:**
- "File not found" errors for files that exist
- Relative paths resolve incorrectly
- Application can't find config files

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker inspect <container_id> --format='{{.Config.WorkingDir}}'` | Configured WORKDIR |
| 2 | `docker run --rm -it <image> pwd` | Actual working directory |
| 3 | `docker run --rm -it <image> ls -la` | Files at working directory |
| 4 | Check Dockerfile `WORKDIR` instruction | Verify path correctness |

**Resolution:**
- Set `WORKDIR` to application root directory
- Use absolute paths in application code for file references
- Verify `COPY` commands place files at WORKDIR

---

## 4. Orchestration and Health Check Failures

Orchestration failures occur when container orchestration systems (Kubernetes, Docker Swarm, etc.) cannot properly manage container lifecycle.

### 4.1 Liveness Probe Failures

**Symptoms:**
- Container restarts repeatedly
- Kubernetes shows "CrashLoopBackOff"
- Docker shows container restarting every few seconds

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker ps -a` | Container restart count increasing |
| 2 | `docker logs <container_id>` | Application logs before restart |
| 3 | `kubectl describe pod <pod-name>` | Liveness probe failure events |
| 4 | `kubectl logs <pod-name>` | Container logs |
| 5 | `curl <container-ip>:<port>/health` | Manual health check |

**Resolution:**
- Increase `livenessProbe.initialDelaySeconds` to allow startup time
- Increase `livenessProbe.periodSeconds` to reduce check frequency
- Fix application to respond to health checks faster
- Ensure health check endpoint doesn't depend on slow external services

### 4.2 Readiness Probe Failures

**Symptoms:**
- Container runs but doesn't receive traffic
- Kubernetes shows pod in "NotReady" state
- Load balancer doesn't route to container

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `kubectl get pods` | Pod status "NotReady" |
| 2 | `kubectl describe pod <pod-name>` | Readiness probe failure events |
| 3 | `kubectl logs <pod-name>` | Application startup logs |
| 4 | `curl <pod-ip>:<port>/ready` | Manual readiness check |
| 5 | Check application startup time vs probe timeout | Startup takes longer than probe timeout |

**Resolution:**
- Increase `readinessProbe.initialDelaySeconds` for startup time
- Make readiness check lightweight (no external dependencies)
- Ensure application signals readiness only when truly ready

### 4.3 Startup Probe Failures

**Symptoms:**
- Container killed before application starts
- Kubernetes shows "CrashLoopBackOff" immediately
- Application needs long initialization time

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `kubectl describe pod <pod-name>` | Startup probe failure events |
| 2 | `kubectl logs <pod-name> --previous` | Previous container logs |
| 3 | Check `startupProbe.initialDelaySeconds` and `startupProbe.periodSeconds` | Probe timing configuration |
| 4 | Measure application startup time locally | Compare to probe settings |

**Resolution:**
- Increase `startupProbe.initialDelaySeconds` for slow-starting apps
- Increase `startupProbe.failureThreshold` to allow more retries
- Optimize application startup time

### 4.4 Network Connectivity Failures

**Symptoms:**
- Container can't reach other services
- DNS resolution failures
- Connection timeouts

**Diagnostic Workflow:**

| Step | Command | What to Look For |
|------|---------|------------------|
| 1 | `docker network ls` | List available networks |
| 2 | `docker inspect <container_id> --format='{{.NetworkSettings.Networks}}'` | Container networks |
| 3 | `docker run --rm --network <network> <image> ping <other-service>` | Test network connectivity |
| 4 | `docker run --rm --network <network> <image> nslookup <service-name>` | Test DNS resolution |
| 5 | `docker network inspect <network-name>` | Inspect network configuration |

**Resolution:**
- Ensure containers are on same Docker network
- Use service names instead of IP addresses for service discovery
- Check firewall rules and security groups

---

## 5. Universal Diagnostic Checklist

Run these commands in order for any container crash:

```bash
# 1. Check container status
docker ps -a --filter name=<container-name>

# 2. View container logs
docker logs <container-id>
docker logs --tail 100 <container-id>

# 3. Inspect container configuration
docker inspect <container-id>

# 4. Check container resource usage
docker stats <container-id>

# 5. Check container events
docker events --filter container=<container-id> --since 1h

# 6. Execute into container (if running)
docker exec -it <container-id> sh

# 7. Run container interactively for debugging
docker run --rm -it <image> sh

# 8. Check Docker daemon logs
journalctl -u docker --since 1h
```

---

## 6. Common Error Codes Reference

| Exit Code | Meaning | Common Cause |
|-----------|---------|--------------|
| 0 | Successful exit | Normal shutdown |
| 1 | General error | Application error, syntax error, missing file |
| 2 | Misuse of shell builtin | Incorrect command usage |
| 126 | Command invoked cannot execute | Permission denied, not executable |
| 127 | Command not found | Binary not in PATH, typo in command |
| 128 | Invalid argument to exit | Invalid exit code |
| 128+n | Fatal error signal n | Signal n killed process |
| 137 | Fatal error signal 9 (SIGKILL) | OOM kill, manual kill -9 |
| 139 | Fatal error signal 11 (SIGSEGV) | Segmentation fault |
| 143 | Fatal error signal 15 (SIGTERM) | Graceful termination |
| 255 | Exit status out of range | Various errors |

---

## Quick Reference: Most Common Issues

| Symptom | Most Likely Cause | First Command to Run |
|---------|-------------------|---------------------|
| Container exits immediately | Missing env var or entrypoint error | `docker logs <container>` |
| Container restarts repeatedly | OOM kill or startup failure | `docker ps -a` + `docker logs <container>` |
| Container runs but doesn't respond | Health check failure or wrong port | `docker inspect` + `curl <ip>:<port>` |
| Container can't connect to database | Network or DNS issue | `docker network inspect <network>` |
| Container uses too much memory | Memory limit too low or app leak | `docker stats <container>` |
| Container can't write files | Volume mount or permissions issue | `docker inspect --format='{{.Mounts}}'` |

---

**Maintenance Tip:** Always tag and version your Docker images. Never use `:latest` in production—use specific version tags to ensure reproducible deployments.