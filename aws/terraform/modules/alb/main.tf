variable "name_prefix" {}; variable "vpc_id" {}; variable "public_subnet_ids" { type = list(string) }; variable "certificate_arn" {}; variable "domain_name" {}
resource "aws_security_group" "alb" { name = "${var.name_prefix}-alb-sg"; vpc_id = var.vpc_id; ingress { from_port = 80; to_port = 80; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }; ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }; egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] } }
resource "aws_lb" "main" { name = "${var.name_prefix}-alb"; load_balancer_type = "application"; security_groups = [aws_security_group.alb.id]; subnets = var.public_subnet_ids; enable_deletion_protection = true }
resource "aws_lb_listener" "http"  { load_balancer_arn = aws_lb.main.arn; port = 80;  protocol = "HTTP";  default_action { type = "redirect"; redirect { port = "443"; protocol = "HTTPS"; status_code = "HTTP_301" } } }
resource "aws_lb_listener" "https" { load_balancer_arn = aws_lb.main.arn; port = 443; protocol = "HTTPS"; ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"; certificate_arn = var.certificate_arn; default_action { type = "fixed-response"; fixed_response { content_type = "text/plain"; message_body = "CoverAI"; status_code = "200" } } }
output "dns_name"            { value = aws_lb.main.dns_name }
output "arn"                 { value = aws_lb.main.arn }
output "https_listener_arn"  { value = aws_lb_listener.https.arn }
output "security_group_id"   { value = aws_security_group.alb.id }
