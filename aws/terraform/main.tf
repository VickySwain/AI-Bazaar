terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws        = { source = "hashicorp/aws";    version = "~> 5.40" }
    kubernetes = { source = "hashicorp/kubernetes"; version = "~> 2.28" }
    helm       = { source = "hashicorp/helm";   version = "~> 2.13" }
  }
  backend "s3" {
    bucket         = "coverai-terraform-state"
    key            = "coverai/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "coverai-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = { Project = var.project, Environment = var.environment, ManagedBy = "Terraform" }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  token                  = module.eks.cluster_token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
    token                  = module.eks.cluster_token
  }
}

locals {
  name_prefix    = "${var.project}-${var.environment}"
  ecr_base       = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
  frontend_image = "${local.ecr_base}/${var.project}-frontend:${var.frontend_image_tag}"
  backend_image  = "${local.ecr_base}/${var.project}-backend:${var.backend_image_tag}"
  ml_image       = "${local.ecr_base}/${var.project}-ml:${var.ml_image_tag}"
}

module "vpc"          { source = "./modules/vpc";          name_prefix = local.name_prefix; vpc_cidr = var.vpc_cidr; availability_zones = var.availability_zones; private_subnet_cidrs = var.private_subnet_cidrs; public_subnet_cidrs = var.public_subnet_cidrs }
module "ecr"          { source = "./modules/ecr";          name_prefix = local.name_prefix; project = var.project }
module "iam"          { source = "./modules/iam";          name_prefix = local.name_prefix; project = var.project; aws_region = var.aws_region; account_id = var.aws_account_id }
module "rds"          { source = "./modules/rds";          name_prefix = local.name_prefix; vpc_id = module.vpc.vpc_id; private_subnet_ids = module.vpc.private_subnet_ids; eks_security_group_id = module.eks.node_security_group_id; db_instance_class = var.db_instance_class; db_allocated_storage = var.db_allocated_storage; db_name = var.db_name; db_username = var.db_username; db_password = var.db_password; multi_az = var.db_multi_az }
module "elasticache"  { source = "./modules/elasticache";  name_prefix = local.name_prefix; vpc_id = module.vpc.vpc_id; private_subnet_ids = module.vpc.private_subnet_ids; eks_security_group_id = module.eks.node_security_group_id; node_type = var.redis_node_type; num_cache_nodes = var.redis_num_cache_nodes }
module "msk"          { source = "./modules/msk";          name_prefix = local.name_prefix; vpc_id = module.vpc.vpc_id; private_subnet_ids = module.vpc.private_subnet_ids; eks_security_group_id = module.eks.node_security_group_id; broker_count = var.msk_broker_count; instance_type = var.msk_instance_type; kafka_version = var.msk_kafka_version }
module "eks"          { source = "./modules/eks";          name_prefix = local.name_prefix; vpc_id = module.vpc.vpc_id; private_subnet_ids = module.vpc.private_subnet_ids; cluster_version = var.eks_cluster_version; node_instance_type = var.eks_node_instance_type; node_min_size = var.eks_node_min_size; node_max_size = var.eks_node_max_size; node_desired_size = var.eks_node_desired_size; node_role_arn = module.iam.eks_node_role_arn; cluster_role_arn = module.iam.eks_cluster_role_arn }
module "alb"          { source = "./modules/alb";          name_prefix = local.name_prefix; vpc_id = module.vpc.vpc_id; public_subnet_ids = module.vpc.public_subnet_ids; certificate_arn = var.acm_certificate_arn; domain_name = var.domain_name }

resource "aws_s3_bucket" "ml_artifacts" {
  bucket = "${local.name_prefix}-ml-artifacts"
}
resource "aws_s3_bucket_versioning" "ml_artifacts" {
  bucket = aws_s3_bucket.ml_artifacts.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "ml_artifacts" {
  bucket = aws_s3_bucket.ml_artifacts.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_secretsmanager_secret" "coverai_secrets" {
  name                    = "${local.name_prefix}/secrets"
  recovery_window_in_days = 7
}
resource "aws_secretsmanager_secret_version" "coverai_secrets" {
  secret_id     = aws_secretsmanager_secret.coverai_secrets.id
  secret_string = jsonencode({ jwt_secret = "CHANGE_ME", jwt_refresh_secret = "CHANGE_ME_2", db_password = var.db_password, razorpay_key_id = "PLACEHOLDER", razorpay_key_secret = "PLACEHOLDER", razorpay_webhook = "PLACEHOLDER", sendgrid_api_key = "PLACEHOLDER", twilio_account_sid = "PLACEHOLDER", twilio_auth_token = "PLACEHOLDER" })
}
