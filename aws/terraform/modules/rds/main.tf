variable "name_prefix" {}; variable "vpc_id" {}; variable "private_subnet_ids" { type = list(string) }; variable "eks_security_group_id" {}
variable "db_instance_class" {}; variable "db_allocated_storage" {}; variable "db_name" {}; variable "db_username" {}; variable "db_password" {}; variable "multi_az" {}
resource "aws_db_subnet_group" "main" { name = "${var.name_prefix}-db"; subnet_ids = var.private_subnet_ids }
resource "aws_security_group" "rds" { name = "${var.name_prefix}-rds-sg"; vpc_id = var.vpc_id; ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [var.eks_security_group_id] }; egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] } }
resource "aws_db_parameter_group" "pg16" { name = "${var.name_prefix}-pg16"; family = "postgres16"; parameter { name = "max_connections"; value = "200" }; parameter { name = "shared_preload_libraries"; value = "pg_stat_statements" } }
resource "aws_db_instance" "main" {
  identifier = "${var.name_prefix}-postgres"; engine = "postgres"; engine_version = "16.2"
  instance_class = var.db_instance_class; allocated_storage = var.db_allocated_storage; max_allocated_storage = 200
  storage_type = "gp3"; storage_encrypted = true; db_name = var.db_name; username = var.db_username; password = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name; vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name = aws_db_parameter_group.pg16.name; multi_az = var.multi_az; publicly_accessible = false
  deletion_protection = true; backup_retention_period = 7; performance_insights_enabled = true; monitoring_interval = 60
  skip_final_snapshot = false; final_snapshot_identifier = "${var.name_prefix}-final"
}
output "endpoint" { value = aws_db_instance.main.endpoint }; output "port" { value = aws_db_instance.main.port }
