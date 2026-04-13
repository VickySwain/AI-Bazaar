project        = "coverai"
environment    = "prod"
aws_region     = "ap-south-1"
aws_account_id = "123456789012"   # Replace with your AWS account ID

# Network
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# EKS
eks_cluster_version   = "1.29"
eks_node_instance_type= "t3.medium"
eks_node_min_size     = 3
eks_node_max_size     = 15
eks_node_desired_size = 4

# RDS
db_instance_class    = "db.t3.large"
db_allocated_storage = 100
db_name              = "coverai_db"
db_username          = "coverai"
db_password          = "CHANGE_ME_STRONG_PASSWORD_HERE"
db_multi_az          = true

# ElastiCache
redis_node_type       = "cache.r6g.large"
redis_num_cache_nodes = 3

# MSK
msk_broker_count  = 3
msk_instance_type = "kafka.m5.large"
msk_kafka_version = "3.6.0"

# Domain
domain_name         = "coverai.in"
acm_certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/YOUR-CERT-ID"

# Image tags (updated by CI/CD)
frontend_image_tag = "latest"
backend_image_tag  = "latest"
ml_image_tag       = "latest"
