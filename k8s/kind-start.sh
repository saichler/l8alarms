#!/usr/bin/env bash
set -e

CLUSTER_NAME="l8alarms"

# Pin the target cluster instead of inheriting the ambient context. `kind
# create cluster` rewrites the global current-context, so whichever kind
# cluster was created last would otherwise own every kubectl call here --
# which is how one project's pods end up inside another's cluster.
KUBECTL=(kubectl --context "kind-${CLUSTER_NAME}")
KIND_CONFIG="kind-cluster.yaml"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install KIND if not present
if ! command -v kind &>/dev/null; then
  echo "kind not found — installing..."
  if [[ "$(uname)" == "Darwin" ]]; then
    brew install kind
  else
    curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
    chmod +x ./kind
    sudo mv ./kind /usr/local/bin/kind
  fi
  echo "kind installed: $(kind version)"
fi

# Check if cluster already exists
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "KIND cluster '${CLUSTER_NAME}' already exists."
  echo "Run ./kind-stop.sh first if you want to recreate it."
  exit 1
fi

# Write cluster config
cat > "${SCRIPT_DIR}/${KIND_CONFIG}" <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          taints:
            - key: node-role.kubernetes.io/control-plane
              effect: NoSchedule
  - role: worker
    extraPortMappings:
      - containerPort: 2780
        hostPort: 2780
        protocol: TCP
EOF

echo "Creating KIND cluster '${CLUSTER_NAME}' (1 control-plane + 1 worker)..."
kind create cluster --name "${CLUSTER_NAME}" --config "${SCRIPT_DIR}/${KIND_CONFIG}"

echo "Waiting for nodes to be Ready..."
"${KUBECTL[@]}" wait --for=condition=Ready nodes --all --timeout=120s

echo "Loading Docker images into KIND cluster..."
IMAGES=(
  saichler/alm-postgres:latest
  saichler/alm-vnet:latest
  saichler/alm:latest
  saichler/alm-web:latest
)

for img in "${IMAGES[@]}"; do
  if docker image inspect "$img" &>/dev/null; then
    echo "  Loading $img..."
    kind load docker-image "$img" --name "${CLUSTER_NAME}"
  else
    echo "  SKIP $img (not found locally — will pull from registry)"
  fi
done

echo "Phase 1: Deploying namespace + postgres + vnet..."
"${KUBECTL[@]}" apply -f "${SCRIPT_DIR}/l8alarms-kind.yaml"

echo "Waiting for alm-postgres to be Ready..."
"${KUBECTL[@]}" -n l8alarms rollout status statefulset/alm-postgres --timeout=120s

echo "Waiting for alm-vnet to be Ready..."
"${KUBECTL[@]}" -n l8alarms rollout status statefulset/alm-vnet --timeout=120s

echo "Phase 2: Waiting for remaining services to be Ready..."
for sts in alm alm-web; do
  echo "  Waiting for ${sts}..."
  "${KUBECTL[@]}" -n l8alarms rollout status statefulset/"${sts}" --timeout=180s
done

echo ""
echo "KIND cluster '${CLUSTER_NAME}' is up and l8alarms is deployed."
echo "Run 'kubectl get pods -n l8alarms' to check status."
echo "UI should be reachable at https://localhost:2780"
echo "Run './kind-stop.sh' to tear down."
