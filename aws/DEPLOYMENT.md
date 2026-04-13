# CoverAI — Complete AWS Deployment Guide

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [AWS Account Setup](#2-aws-account-setup)
3. [ACM Certificate](#3-acm-ssl-certificate)
4. [One-Command Deploy](#4-one-command-deploy)
5. [Manual Step-by-Step](#5-manual-step-by-step)
6. [CI/CD Pipeline Setup](#6-cicd-pipeline-setup)
7. [DNS & Domain](#7-dns--domain)
8. [Verify Production](#8-verify-production)
9. [Operations Runbook](#9-operations-runbook)
10. [Cost Estimate](#10-cost-estimate)

---

## 1. Prerequisites

Install these tools locally:

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install
aws --version  # aws-cli/2.x

# Terraform 1.7+
wget https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip
unzip terraform_1.7.0_linux_amd64.zip && sudo mv terraform /usr/local/bin/
terraform --version

# kubectl 1.29
curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
kubectl version --client

# Helm 3.14
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version

# Docker (for building images)
# https://docs.docker.com/engine/install/
```

Configure AWS CLI:
```bash
aws configure
# AWS Access Key ID:     your-key-id
# AWS Secret Access Key: your-secret
# Default region:        ap-south-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## 2. AWS Account Setup

### 2a. Set required environment variables

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION="ap-south-1"
export DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"  # Save this securely!
export PROJECT="coverai"
export ENVIRONMENT="prod"

# Save to a .env file (never commit this)
cat > ~/.coverai-aws.env << EOF
export AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
export AWS_REGION=${AWS_REGION}
export DB_PASSWORD="${DB_PASSWORD}"
EOF
echo "Saved to ~/.coverai-aws.env"
echo "DB_PASSWORD: ${DB_PASSWORD}"  # Copy and save this!
```

### 2b. Create IAM user for Terraform (if using keys instead of roles)

```bash
# Create a Terraform IAM user with limited permissions
aws iam create-user --user-name coverai-terraform

aws iam attach-user-policy --user-name coverai-terraform \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess  # Tighten in prod

aws iam create-access-key --user-name coverai-terraform
# Save the AccessKeyId and SecretAccessKey
```

---

## 3. ACM SSL Certificate

You need an SSL certificate for `coverai.in` and `*.coverai.in`.

```bash
# Request certificate (DNS validation)
CERT_ARN=$(aws acm request-certificate \
  --domain-name "coverai.in" \
  --subject-alternative-names "*.coverai.in" "api.coverai.in" \
  --validation-method DNS \
  --region ap-south-1 \
  --query CertificateArn \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get the DNS validation records
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord'
```

Add the CNAME records shown to your DNS provider, then wait for validation:
```bash
# Wait for certificate validation (can take 5-30 minutes)
aws acm wait certificate-validated --certificate-arn "$CERT_ARN"
echo "Certificate validated!"

# Save for Terraform
export ACM_CERT_ARN="$CERT_ARN"
```

Update `terraform/environments/prod/terraform.tfvars`:
```hcl
acm_certificate_arn = "arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/YOUR-ID"
```

Also update `k8s/ingress/ingress.yaml`:
```yaml
alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/YOUR-ID"
```

---

## 4. One-Command Deploy

```bash
cd coverai-aws

# Make scripts executable
chmod +x scripts/deploy.sh scripts/rollback.sh

# Set all required env vars
source ~/.coverai-aws.env
export CLUSTER_NAME="coverai-prod-eks"
export DOMAIN="coverai.in"
export TRAIN_MODEL="true"   # Set false if model already trained
export GITHUB_ORG="your-github-org"
export GITHUB_REPO="coverai"

# Run full deployment (~30-45 minutes first time)
./scripts/deploy.sh
```

This single script:
1. Creates S3 + DynamoDB for Terraform state
2. Creates GitHub Actions OIDC provider
3. Runs `terraform plan` → prompts for confirmation → `terraform apply`
4. Creates: VPC, EKS, RDS, ElastiCache, MSK, ECR, ALB, IAM, Secrets Manager
5. Installs cluster add-ons (ALB controller, ESO, Metrics Server)
6. Builds and pushes all 3 Docker images to ECR
7. Optionally trains the ML model and uploads to S3
8. Deploys all K8s manifests (namespaces, configs, secrets, deployments, ingress, HPA)
9. Verifies pod health

---

## 5. Manual Step-by-Step

If you prefer to run each phase manually:

### Phase 1 — Bootstrap Terraform Backend

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket coverai-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

aws s3api put-bucket-versioning \
  --bucket coverai-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket coverai-terraform-state \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name coverai-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### Phase 2 — Provision AWS Infrastructure

```bash
cd terraform

# Initialise
terraform init \
  -backend-config="bucket=coverai-terraform-state" \
  -backend-config="key=coverai/prod/terraform.tfstate" \
  -backend-config="region=ap-south-1" \
  -backend-config="dynamodb_table=coverai-terraform-locks"

# Plan (review carefully)
terraform plan \
  -var="environment=prod" \
  -var="aws_region=ap-south-1" \
  -var="aws_account_id=${AWS_ACCOUNT_ID}" \
  -var="db_password=${DB_PASSWORD}" \
  -var-file="environments/prod/terraform.tfvars" \
  -out=tfplan

# Apply (creates ~35 AWS resources, takes ~20 minutes)
terraform apply tfplan

# Save outputs
terraform output -json > /tmp/tf-outputs.json
cat /tmp/tf-outputs.json

cd ..
```

### Phase 3 — Configure kubectl

```bash
aws eks update-kubeconfig \
  --name coverai-prod-eks \
  --region ap-south-1

kubectl get nodes  # Should show 3+ nodes in Ready state
```

### Phase 4 — Install Cluster Add-ons

```bash
# 1. AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts && helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=coverai-prod-eks \
  --set serviceAccount.create=true \
  --wait

# 2. External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io && helm repo update

helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace --wait

# 3. Metrics Server (for HPA)
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server && helm repo update

helm upgrade --install metrics-server metrics-server/metrics-server \
  -n kube-system \
  --set args[0]="--kubelet-insecure-tls" \
  --wait

# 4. kube-prometheus-stack (optional but recommended)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts && helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n coverai-monitoring --create-namespace \
  --set grafana.adminPassword=coverai_grafana \
  --wait --timeout 10m
```

### Phase 5 — Build & Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS \
  --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com"

ECR="${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com"
TAG="$(git rev-parse --short HEAD)"

# Backend
docker build --target production --platform linux/amd64 \
  -t "${ECR}/coverai-backend:${TAG}" \
  -t "${ECR}/coverai-backend:latest" \
  ../coverai-backend/
docker push "${ECR}/coverai-backend:${TAG}"
docker push "${ECR}/coverai-backend:latest"

# Frontend
docker build --target production --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.coverai.in/api/v1 \
  --build-arg NEXT_PUBLIC_APP_URL=https://coverai.in \
  -t "${ECR}/coverai-frontend:${TAG}" \
  -t "${ECR}/coverai-frontend:latest" \
  ../coverai-frontend/
docker push "${ECR}/coverai-frontend:${TAG}"
docker push "${ECR}/coverai-frontend:latest"

# ML Service
docker build --target production --platform linux/amd64 \
  -t "${ECR}/coverai-ml:${TAG}" \
  -t "${ECR}/coverai-ml:latest" \
  ../coverai-ml/
docker push "${ECR}/coverai-ml:${TAG}"
docker push "${ECR}/coverai-ml:latest"
```

### Phase 6 — Train & Upload ML Model

```bash
cd ../coverai-ml

# Train with production data
export DATABASE_URL="postgresql://coverai:${DB_PASSWORD}@<RDS_ENDPOINT>:5432/coverai_db"
python scripts/train.py --users 10000 --evaluate

# Upload model to S3
BUCKET="coverai-prod-ml-artifacts"
for FILE in data/models/*.joblib data/models/*.json; do
  aws s3 cp "$FILE" "s3://${BUCKET}/models/$(basename $FILE)"
  echo "Uploaded: $(basename $FILE)"
done

cd ../coverai-aws
```

### Phase 7 — Deploy to Kubernetes

```bash
# Apply all manifests in order
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/configmaps/

# Inject infrastructure endpoints
DB_HOST=$(terraform -chdir=terraform output -raw rds_endpoint | cut -d: -f1)
REDIS_HOST=$(terraform -chdir=terraform output -raw redis_endpoint | cut -d: -f1)
KAFKA_BROKERS=$(terraform -chdir=terraform output -raw msk_brokers)

kubectl create secret generic infra-endpoints \
  --namespace=coverai \
  --from-literal=db_host="$DB_HOST" \
  --from-literal=redis_host="$REDIS_HOST" \
  --from-literal=kafka_brokers="$KAFKA_BROKERS" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/secrets/
echo "Waiting for secrets to sync from AWS Secrets Manager..."
sleep 30

kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/hpa/
kubectl apply -f k8s/ingress/

# Wait for rollouts
kubectl rollout status deployment/ml-service -n coverai --timeout=300s
kubectl rollout status deployment/backend    -n coverai --timeout=300s
kubectl rollout status deployment/frontend   -n coverai --timeout=180s
```

---

## 6. CI/CD Pipeline Setup

### Add GitHub repository secrets

```
Settings → Secrets and variables → Actions → New repository secret
```

| Secret | Value |
|--------|-------|
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `DB_PASSWORD` | Strong database password |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |
| `DATABASE_URL_PROD` | Full PostgreSQL connection string |
| `REDIS_URL_PROD` | Full Redis connection string |

### Create IAM role for GitHub Actions (OIDC)

```bash
GITHUB_ORG="your-github-org"
GITHUB_REPO="coverai"

# Create trust policy
cat > /tmp/github-oidc-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
      }
    }
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name coverai-github-actions-role \
  --assume-role-policy-document file:///tmp/github-oidc-trust.json

# Attach policies
aws iam attach-role-policy \
  --role-name coverai-github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

aws iam attach-role-policy \
  --role-name coverai-github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

# Custom policy for EKS, SSM, SecretsManager
cat > /tmp/github-actions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow", "Action": ["eks:DescribeCluster", "eks:UpdateClusterConfig"], "Resource": "*"},
    {"Effect": "Allow", "Action": ["ssm:GetParameter", "ssm:PutParameter"], "Resource": "arn:aws:ssm:*:${AWS_ACCOUNT_ID}:parameter/coverai/*"},
    {"Effect": "Allow", "Action": ["secretsmanager:GetSecretValue"], "Resource": "arn:aws:secretsmanager:*:${AWS_ACCOUNT_ID}:secret:coverai-*"},
    {"Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject"], "Resource": "arn:aws:s3:::coverai-*/*"}
  ]
}
EOF

aws iam put-role-policy \
  --role-name coverai-github-actions-role \
  --policy-name coverai-github-actions-inline \
  --policy-document file:///tmp/github-actions-policy.json

echo "Role ARN: arn:aws:iam::${AWS_ACCOUNT_ID}:role/coverai-github-actions-role"
```

---

## 7. DNS & Domain

After deployment, get the ALB DNS name:
```bash
kubectl get ingress coverai-ingress -n coverai \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

In Route53 (or your DNS provider), create:

| Record | Type | Value |
|--------|------|-------|
| `coverai.in` | A (Alias) | ALB DNS name |
| `www.coverai.in` | CNAME | ALB DNS name |
| `api.coverai.in` | CNAME | ALB DNS name |

Wait 2-5 minutes for DNS propagation, then test:
```bash
curl -s https://api.coverai.in/health/ping | python3 -m json.tool
```

---

## 8. Verify Production

Run the full verification suite:

```bash
# 1. All pods running
kubectl get pods -n coverai

# 2. HPA active
kubectl get hpa -n coverai

# 3. Ingress has ALB assigned
kubectl describe ingress coverai-ingress -n coverai

# 4. Backend health
curl -s https://api.coverai.in/health | python3 -m json.tool

# 5. ML service health (via backend proxy)
curl -s https://api.coverai.in/api/v1/recommendations/ml-health \
  -H "Authorization: Bearer YOUR_JWT" | python3 -m json.tool

# 6. Policy catalog
curl -s "https://api.coverai.in/api/v1/policies?limit=3" | python3 -m json.tool

# 7. Frontend loads
curl -I https://coverai.in

# 8. Check certificate
echo | openssl s_client -connect api.coverai.in:443 2>/dev/null | \
  openssl x509 -noout -dates

# 9. Database connectivity from pod
kubectl exec -n coverai \
  $(kubectl get pod -n coverai -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- wget -qO- http://localhost:3001/health | python3 -m json.tool
```

---

## 9. Operations Runbook

### View logs
```bash
# All backend logs (live)
kubectl logs -n coverai -l app=backend -f --tail=100

# ML service logs
kubectl logs -n coverai -l app=ml-service -f --tail=100

# Specific pod
kubectl logs -n coverai <pod-name> --previous  # Previous container crash logs
```

### Scale manually
```bash
# Emergency scale-up
kubectl scale deployment backend --replicas=10 -n coverai

# Scale ML service
kubectl scale deployment ml-service --replicas=4 -n coverai
```

### Hot-reload ML model (without redeploying)
```bash
# Port-forward to ML service
kubectl port-forward svc/ml-service 8001:8000 -n coverai &

# Trigger hot-reload
curl -X POST http://localhost:8001/training/reload
# {"status":"ok","message":"Model reloaded","version":"v1.0.0"}
```

### Database migrations
```bash
# Run migrations via kubectl exec
kubectl exec -n coverai \
  $(kubectl get pod -n coverai -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- npm run migration:run
```

### Check pod resource usage
```bash
kubectl top pods -n coverai
kubectl top nodes
```

### Debug a specific pod
```bash
kubectl exec -it \
  $(kubectl get pod -n coverai -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -n coverai \
  -- /bin/sh
```

### Rollback a deploy
```bash
# Automated rollback
chmod +x scripts/rollback.sh
./scripts/rollback.sh

# Or manual per-service
kubectl rollout undo deployment/backend -n coverai
kubectl rollout history deployment/backend -n coverai
kubectl rollout undo deployment/backend --to-revision=2 -n coverai
```

### Monitor Kafka topics
```bash
# Port-forward Kafka UI
kubectl port-forward svc/kafka-ui 8080:8080 -n coverai-infra &
open http://localhost:8080

# Or via CLI
kubectl exec -n coverai-infra -it <kafka-pod> -- \
  kafka-topics.sh --bootstrap-server localhost:9092 --list
```

---

## 10. Cost Estimate (ap-south-1, prod)

| Resource | Spec | Est. Monthly (USD) |
|----------|------|--------------------|
| EKS Cluster | 1 control plane | $73 |
| EC2 Worker Nodes | 4× t3.medium ON_DEMAND | $120 |
| EC2 ML Nodes | 1× c5.xlarge SPOT | $25 |
| RDS PostgreSQL | db.t3.large Multi-AZ | $120 |
| ElastiCache Redis | cache.r6g.large × 3 | $180 |
| MSK Kafka | kafka.m5.large × 3 | $210 |
| NAT Gateways | 3× NAT | $99 |
| ALB | 1 ALB | $20 |
| ECR | 3 repos | $5 |
| S3 | State + ML models | $5 |
| Data Transfer | ~100GB/month | $9 |
| **Total** | | **~$866/month** |

**Cost reduction options:**
- Use SPOT instances for all non-critical node groups → saves 60-70%
- Use single-AZ for RDS (remove Multi-AZ) in non-prod → saves $60
- Kafka MSK → self-hosted Kafka on a single m5.large → saves $180
- Redis 1-node instead of 3 → saves $120
- **Dev/staging total: ~$200/month** with aggressive cost-cutting

```bash
# Set up AWS Cost Anomaly Detection
aws ce create-anomaly-monitor \
  --anomaly-monitor '{"MonitorName":"CoverAI Cost Monitor","MonitorType":"DIMENSIONAL","MonitorDimension":"SERVICE"}'
```
