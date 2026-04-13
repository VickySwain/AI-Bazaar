#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CoverAI AWS Deployment Script
# Provisions infrastructure AND deploys all services.
# Idempotent — safe to run multiple times.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; P='\033[0;35m'; NC='\033[0m'; BOLD='\033[1m'
ok()      { echo -e "${G}✓${NC} $1"; }
warn()    { echo -e "${Y}⚠${NC}  $1"; }
err()     { echo -e "${R}✗${NC} $1" >&2; exit 1; }
step()    { echo -e "\n${P}━━━ $1 ━━━${NC}"; }
info()    { echo -e "${B}ℹ${NC}  $1"; }

# ── Config (override via env vars) ─────────────────────────────────────────
AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
PROJECT="${PROJECT:-coverai}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
CLUSTER_NAME="${CLUSTER_NAME:-coverai-prod-eks}"
NAMESPACE="${NAMESPACE:-coverai}"
DB_PASSWORD="${DB_PASSWORD:-}"
DOMAIN="${DOMAIN:-coverai.in}"
TRAIN_MODEL="${TRAIN_MODEL:-false}"
SKIP_INFRA="${SKIP_INFRA:-false}"

ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ── Pre-flight checks ──────────────────────────────────────────────────────
step "Pre-flight Checks"
for cmd in aws terraform kubectl helm docker; do
  command -v $cmd &>/dev/null && ok "$cmd found" || err "$cmd not installed"
done

[[ -n "$AWS_ACCOUNT_ID" ]] || err "AWS_ACCOUNT_ID not set. Export it: export AWS_ACCOUNT_ID=123456789012"
[[ -n "$DB_PASSWORD"    ]] || err "DB_PASSWORD not set. Export a strong password."

aws sts get-caller-identity --query 'Account' --output text &>/dev/null && ok "AWS credentials valid" || err "AWS credentials invalid"

# ── Bootstrap: S3 + DynamoDB for Terraform state ──────────────────────────
step "Bootstrap Terraform State Backend"

STATE_BUCKET="${PROJECT}-terraform-state"
LOCK_TABLE="${PROJECT}-terraform-locks"

# Create S3 bucket if not exists
if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  ok "S3 state bucket exists: $STATE_BUCKET"
else
  info "Creating S3 state bucket: $STATE_BUCKET"
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION"
  aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --server-side-encryption-configuration \
      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
  ok "S3 state bucket created"
fi

# Create DynamoDB lock table if not exists
if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$AWS_REGION" &>/dev/null; then
  ok "DynamoDB lock table exists: $LOCK_TABLE"
else
  info "Creating DynamoDB lock table: $LOCK_TABLE"
  aws dynamodb create-table \
    --table-name "$LOCK_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$AWS_REGION"
  aws dynamodb wait table-exists --table-name "$LOCK_TABLE" --region "$AWS_REGION"
  ok "DynamoDB lock table created"
fi

# ── GitHub Actions OIDC Role ───────────────────────────────────────────────
step "GitHub Actions IAM Role (OIDC)"
GITHUB_ORG="${GITHUB_ORG:-your-github-org}"
GITHUB_REPO="${GITHUB_REPO:-coverai}"

# Create OIDC provider for GitHub Actions if not exists
OIDC_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" &>/dev/null; then
  ok "GitHub OIDC provider exists"
else
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
  ok "GitHub OIDC provider created"
fi

# ── Provision Infrastructure with Terraform ────────────────────────────────
if [[ "$SKIP_INFRA" != "true" ]]; then
  step "Terraform — Provision AWS Infrastructure"
  cd terraform

  terraform init \
    -backend-config="bucket=${STATE_BUCKET}" \
    -backend-config="key=${PROJECT}/${ENVIRONMENT}/terraform.tfstate" \
    -backend-config="region=${AWS_REGION}" \
    -backend-config="dynamodb_table=${LOCK_TABLE}"

  terraform validate
  ok "Terraform config valid"

  info "Planning Terraform changes..."
  terraform plan \
    -var="environment=${ENVIRONMENT}" \
    -var="aws_region=${AWS_REGION}" \
    -var="aws_account_id=${AWS_ACCOUNT_ID}" \
    -var="db_password=${DB_PASSWORD}" \
    -var-file="environments/${ENVIRONMENT}/terraform.tfvars" \
    -out=tfplan

  echo ""
  read -rp "$(echo -e "${Y}Apply this plan? [yes/no]:${NC} ")" CONFIRM
  [[ "$CONFIRM" == "yes" ]] || { warn "Terraform apply cancelled."; exit 0; }

  terraform apply tfplan
  ok "Infrastructure provisioned"

  # Extract outputs
  RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
  DB_HOST=$(echo "$RDS_ENDPOINT" | cut -d: -f1)
  REDIS_HOST=$(terraform output -raw redis_endpoint | cut -d: -f1)
  KAFKA_BROKERS=$(terraform output -raw msk_brokers)
  ECR_BACKEND=$(terraform output -raw ecr_backend_url)
  ECR_FRONTEND=$(terraform output -raw ecr_frontend_url)
  ECR_ML=$(terraform output -raw ecr_ml_url)
  ML_BUCKET=$(terraform output -raw ml_artifacts_bucket)

  # Store endpoints in SSM for CI/CD
  for PARAM in db_host redis_host kafka_brokers; do
    case $PARAM in
      db_host)      VAL="$DB_HOST" ;;
      redis_host)   VAL="$REDIS_HOST" ;;
      kafka_brokers)VAL="$KAFKA_BROKERS" ;;
    esac
    aws ssm put-parameter --name "/${PROJECT}/${ENVIRONMENT}/${PARAM}" \
      --value "$VAL" --type "SecureString" --overwrite || true
  done
  ok "Infrastructure endpoints stored in SSM"

  cd ..
else
  info "Skipping Terraform (SKIP_INFRA=true)"
  DB_HOST=$(aws ssm get-parameter --name "/${PROJECT}/${ENVIRONMENT}/db_host" --query Parameter.Value --output text)
  REDIS_HOST=$(aws ssm get-parameter --name "/${PROJECT}/${ENVIRONMENT}/redis_host" --query Parameter.Value --output text)
  KAFKA_BROKERS=$(aws ssm get-parameter --name "/${PROJECT}/${ENVIRONMENT}/kafka_brokers" --query Parameter.Value --output text)
  ECR_BACKEND="${ECR_BASE}/${PROJECT}-backend"
  ECR_FRONTEND="${ECR_BASE}/${PROJECT}-frontend"
  ECR_ML="${ECR_BASE}/${PROJECT}-ml"
  ML_BUCKET="${PROJECT}-${ENVIRONMENT}-ml-artifacts"
fi

# ── Configure kubectl ──────────────────────────────────────────────────────
step "Configure kubectl for EKS"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
kubectl cluster-info && ok "kubectl connected to $CLUSTER_NAME"

# ── Install cluster add-ons via Helm ──────────────────────────────────────
step "Install Cluster Add-ons"

helm repo add aws-load-balancer-controller https://aws.github.io/eks-charts
helm repo add external-secrets https://charts.external-secrets.io
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server
helm repo update

# AWS Load Balancer Controller
helm upgrade --install aws-load-balancer-controller aws-load-balancer-controller/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName="$CLUSTER_NAME" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --wait --timeout 3m || warn "ALB controller already installed"
ok "AWS Load Balancer Controller installed"

# External Secrets Operator
helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --wait --timeout 3m || warn "ESO already installed"
ok "External Secrets Operator installed"

# Metrics Server (required for HPA)
helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args[0]="--kubelet-insecure-tls" \
  --wait --timeout 3m || warn "Metrics server already installed"
ok "Metrics Server installed"

# ── Build Docker images ────────────────────────────────────────────────────
step "Build & Push Docker Images"

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"
ok "ECR login successful"

GIT_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "manual-$(date +%Y%m%d%H%M%S)")

build_and_push() {
  local SERVICE=$1; local CONTEXT=$2; local ECR_URL=$3
  info "Building ${SERVICE} (${GIT_TAG})..."
  docker build \
    --target production \
    --platform linux/amd64 \
    --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --build-arg GIT_SHA="$GIT_TAG" \
    -t "${ECR_URL}:${GIT_TAG}" \
    -t "${ECR_URL}:latest" \
    "$CONTEXT"
  docker push "${ECR_URL}:${GIT_TAG}"
  docker push "${ECR_URL}:latest"
  ok "Pushed ${SERVICE}:${GIT_TAG}"
}

build_and_push "backend"  "../coverai-backend"  "$ECR_BACKEND"
build_and_push "frontend" "../coverai-frontend" "$ECR_FRONTEND"
build_and_push "ml"       "../coverai-ml"       "$ECR_ML"

# ── Train ML model (optional) ─────────────────────────────────────────────
if [[ "$TRAIN_MODEL" == "true" ]]; then
  step "Train ML Model"
  cd ../coverai-ml
  python scripts/train.py --users 10000 --evaluate
  python scripts/materialize_features.py --dry-run

  for FILE in data/models/*.joblib data/models/*.json; do
    [ -f "$FILE" ] || continue
    aws s3 cp "$FILE" "s3://${ML_BUCKET}/models/$(basename $FILE)"
    ok "Uploaded $(basename $FILE) to S3"
  done
  cd ../coverai-aws
fi

# ── Deploy Kubernetes manifests ────────────────────────────────────────────
step "Deploy to Kubernetes"

kubectl apply -f k8s/namespaces/
ok "Namespaces applied"

kubectl apply -f k8s/configmaps/
ok "ConfigMaps applied"

# Inject infra endpoints as K8s secret
kubectl create secret generic infra-endpoints \
  --namespace="$NAMESPACE" \
  --from-literal=db_host="$DB_HOST" \
  --from-literal=redis_host="$REDIS_HOST" \
  --from-literal=kafka_brokers="$KAFKA_BROKERS" \
  --dry-run=client -o yaml | kubectl apply -f -
ok "Infrastructure endpoints secret applied"

kubectl apply -f k8s/secrets/
ok "External Secrets applied"
info "Waiting 30s for ESO to sync secrets..."
sleep 30

# Patch deployment images with current ECR tags
for DEPLOY_FILE in k8s/deployments/all-deployments.yaml; do
  sed -i \
    "s|coverai-backend:latest|coverai-backend:${GIT_TAG}|g;
     s|coverai-frontend:latest|coverai-frontend:${GIT_TAG}|g;
     s|coverai-ml:latest|coverai-ml:${GIT_TAG}|g;
     s|123456789012.dkr.ecr.ap-south-1.amazonaws.com|${ECR_BASE}|g" \
    "$DEPLOY_FILE"
done

kubectl apply -f k8s/deployments/
ok "Deployments applied"

# Wait for rollouts
for DEPLOY in ml-service backend frontend; do
  info "Waiting for $DEPLOY rollout..."
  kubectl rollout status deployment/$DEPLOY \
    --namespace="$NAMESPACE" --timeout=300s
  ok "$DEPLOY is running"
done

kubectl apply -f k8s/services/
kubectl apply -f k8s/hpa/
kubectl apply -f k8s/ingress/
kubectl apply -f k8s/monitoring/ 2>/dev/null || warn "Monitoring CRDs not installed — skipping"
ok "All K8s resources applied"

# ── Post-deploy verification ───────────────────────────────────────────────
step "Post-Deploy Verification"

echo ""
echo -e "${BOLD}Pod Status:${NC}"
kubectl get pods -n "$NAMESPACE" -o wide

echo ""
echo -e "${BOLD}Services:${NC}"
kubectl get svc -n "$NAMESPACE"

echo ""
echo -e "${BOLD}Ingress:${NC}"
kubectl get ingress -n "$NAMESPACE"

echo ""
ALB_DNS=$(kubectl get ingress coverai-ingress -n "$NAMESPACE" \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

echo -e "${G}${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${G}${BOLD}  CoverAI deployed successfully to AWS!${NC}"
echo -e "${G}${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${B}Image tag:${NC}   ${GIT_TAG}"
echo -e "  ${B}Cluster:${NC}     ${CLUSTER_NAME}"
echo -e "  ${B}Namespace:${NC}   ${NAMESPACE}"
echo -e "  ${B}ALB DNS:${NC}     ${ALB_DNS}"
echo ""
echo -e "  Next steps:"
echo -e "  1. Point ${BOLD}coverai.in${NC} → ${ALB_DNS} in Route53"
echo -e "  2. Wait ~5min for ALB to become active"
echo -e "  3. Test: curl https://api.coverai.in/health/ping"
echo ""
