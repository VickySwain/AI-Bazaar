variable "name_prefix" {}; variable "project" {}; variable "aws_region" {}; variable "account_id" {}
resource "aws_iam_role" "eks_cluster" { name = "${var.name_prefix}-eks-cluster"; assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "eks.amazonaws.com" }, Action = "sts:AssumeRole" }] }) }
resource "aws_iam_role_policy_attachment" "eks_cluster" { role = aws_iam_role.eks_cluster.name; policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy" }
resource "aws_iam_role_policy_attachment" "eks_vpc"     { role = aws_iam_role.eks_cluster.name; policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController" }
resource "aws_iam_role" "eks_node" { name = "${var.name_prefix}-eks-node"; assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }] }) }
resource "aws_iam_role_policy_attachment" "worker"   { role = aws_iam_role.eks_node.name; policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy" }
resource "aws_iam_role_policy_attachment" "cni"      { role = aws_iam_role.eks_node.name; policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy" }
resource "aws_iam_role_policy_attachment" "ecr"      { role = aws_iam_role.eks_node.name; policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly" }
resource "aws_iam_role_policy_attachment" "ssm"      { role = aws_iam_role.eks_node.name; policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" }
resource "aws_iam_policy" "secrets_s3" { name = "${var.name_prefix}-secrets-s3"; policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"], Resource = "arn:aws:secretsmanager:${var.aws_region}:${var.account_id}:secret:${var.name_prefix}/*" }, { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"], Resource = ["arn:aws:s3:::${var.name_prefix}-ml-artifacts", "arn:aws:s3:::${var.name_prefix}-ml-artifacts/*"] }] }) }
resource "aws_iam_role_policy_attachment" "node_secrets" { role = aws_iam_role.eks_node.name; policy_arn = aws_iam_policy.secrets_s3.arn }
output "eks_cluster_role_arn" { value = aws_iam_role.eks_cluster.arn }
output "eks_node_role_arn"    { value = aws_iam_role.eks_node.arn }
