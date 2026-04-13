variable "name_prefix" {}
variable "project" {}
resource "aws_ecr_repository" "frontend" { name = "${var.project}-frontend"; image_tag_mutability = "MUTABLE"; image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_repository" "backend"  { name = "${var.project}-backend";  image_tag_mutability = "MUTABLE"; image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_repository" "ml"       { name = "${var.project}-ml";       image_tag_mutability = "MUTABLE"; image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_lifecycle_policy" "frontend" { repository = aws_ecr_repository.frontend.name; policy = jsonencode({ rules = [{ rulePriority = 1, description = "Keep last 20", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }, action = { type = "expire" } }] }) }
resource "aws_ecr_lifecycle_policy" "backend"  { repository = aws_ecr_repository.backend.name;  policy = jsonencode({ rules = [{ rulePriority = 1, description = "Keep last 20", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }, action = { type = "expire" } }] }) }
resource "aws_ecr_lifecycle_policy" "ml"       { repository = aws_ecr_repository.ml.name;       policy = jsonencode({ rules = [{ rulePriority = 1, description = "Keep last 20", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }, action = { type = "expire" } }] }) }
output "frontend_url" { value = aws_ecr_repository.frontend.repository_url }
output "backend_url"  { value = aws_ecr_repository.backend.repository_url }
output "ml_url"       { value = aws_ecr_repository.ml.repository_url }
