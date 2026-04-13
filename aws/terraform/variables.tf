variable "project" {
  description = "Project name used across all resources"
  type        = string
  default     = "coverai"
}

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "aws_account_id" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "eks_cluster_version" {
  type    = string
  default = "1.29"
}

variable "eks_node_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "eks_node_min_size"     { type = number; default = 2 }
variable "eks_node_max_size"     { type = number; default = 10 }
variable "eks_node_desired_size" { type = number; default = 3 }

variable "db_instance_class"    { type = string; default = "db.t3.medium" }
variable "db_allocated_storage" { type = number; default = 50 }
variable "db_name"              { type = string; default = "coverai_db" }
variable "db_username"          { type = string; sensitive = true; default = "coverai" }
variable "db_password"          { type = string; sensitive = true }
variable "db_multi_az"          { type = bool;   default = true }

variable "redis_node_type"       { type = string; default = "cache.t3.medium" }
variable "redis_num_cache_nodes" { type = number; default = 3 }

variable "msk_broker_count"   { type = number; default = 3 }
variable "msk_instance_type"  { type = string; default = "kafka.t3.small" }
variable "msk_kafka_version"  { type = string; default = "3.6.0" }

variable "domain_name"         { type = string; default = "coverai.in" }
variable "acm_certificate_arn" { type = string; default = "" }

variable "frontend_image_tag" { type = string; default = "latest" }
variable "backend_image_tag"  { type = string; default = "latest" }
variable "ml_image_tag"       { type = string; default = "latest" }
