variable "name_prefix" {}; variable "vpc_id" {}; variable "private_subnet_ids" { type = list(string) }; variable "eks_security_group_id" {}
variable "broker_count" {}; variable "instance_type" {}; variable "kafka_version" {}
resource "aws_security_group" "msk" { name = "${var.name_prefix}-msk-sg"; vpc_id = var.vpc_id; ingress { from_port = 9092; to_port = 9096; protocol = "tcp"; security_groups = [var.eks_security_group_id] }; egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] } }
resource "aws_msk_configuration" "main" { name = "${var.name_prefix}-kafka-cfg"; kafka_versions = [var.kafka_version]; server_properties = "auto.create.topics.enable=true\ndefault.replication.factor=3\nmin.insync.replicas=2\nnum.partitions=6\nlog.retention.hours=168\n" }
resource "aws_msk_cluster" "main" {
  cluster_name = "${var.name_prefix}-kafka"; kafka_version = var.kafka_version; number_of_broker_nodes = var.broker_count
  broker_node_group_info { instance_type = var.instance_type; client_subnets = slice(var.private_subnet_ids, 0, min(var.broker_count, length(var.private_subnet_ids))); security_groups = [aws_security_group.msk.id]; storage_info { ebs_storage_info { volume_size = 100 } } }
  encryption_info { encryption_in_transit { client_broker = "TLS_PLAINTEXT"; in_cluster = true } }
  configuration_info { arn = aws_msk_configuration.main.arn; revision = aws_msk_configuration.main.latest_revision }
  open_monitoring { prometheus { jmx_exporter { enabled_in_broker = true }; node_exporter { enabled_in_broker = true } } }
}
output "bootstrap_brokers" { value = aws_msk_cluster.main.bootstrap_brokers }
output "bootstrap_brokers_tls" { value = aws_msk_cluster.main.bootstrap_brokers_tls }
