variable "name_prefix" {}; variable "vpc_id" {}; variable "private_subnet_ids" { type = list(string) }; variable "eks_security_group_id" {}
variable "node_type" {}; variable "num_cache_nodes" {}
resource "aws_elasticache_subnet_group" "main" { name = "${var.name_prefix}-redis"; subnet_ids = var.private_subnet_ids }
resource "aws_security_group" "redis" { name = "${var.name_prefix}-redis-sg"; vpc_id = var.vpc_id; ingress { from_port = 6379; to_port = 6379; protocol = "tcp"; security_groups = [var.eks_security_group_id] }; egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] } }
resource "aws_elasticache_parameter_group" "redis7" { name = "${var.name_prefix}-redis7"; family = "redis7"; parameter { name = "maxmemory-policy"; value = "allkeys-lru" } }
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.name_prefix}-redis"; description = "CoverAI Redis"
  node_type = var.node_type; num_node_groups = 1; replicas_per_node_group = max(0, var.num_cache_nodes - 1)
  automatic_failover_enabled = true; multi_az_enabled = true; at_rest_encryption_enabled = true; transit_encryption_enabled = true
  parameter_group_name = aws_elasticache_parameter_group.redis7.name; subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]; snapshot_retention_limit = 3
}
output "primary_endpoint" { value = aws_elasticache_replication_group.main.primary_endpoint_address }
output "reader_endpoint"  { value = aws_elasticache_replication_group.main.reader_endpoint_address }
