

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP Zone"
  type        = string
  default     = "us-central1-a"
}

variable "ssh_user" {
  description = "SSH username"
  type        = string
  default     = "ubuntu"
}

variable "ssh_pub_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}


variable "machine_type" {
  description = <<-EOT
    GCP machine type for the SRE VM.
    Vertical scaling options:
      e2-medium      → 1 vCPU,  4GB RAM  (Assignment 5 default)
      e2-standard-2  → 2 vCPU,  8GB RAM  (Assignment 6 default)
      e2-standard-4  → 4 vCPU, 16GB RAM  (high load)
      e2-standard-8  → 8 vCPU, 32GB RAM  (production)
  EOT
  type        = string
  default     = "e2-standard-2"
}

variable "disk_size_gb" {
  description = "Boot disk size in GB. Increase for more Docker image storage and logs."
  type        = number
  default     = 30
}

variable "repo_url" {
  description = "Git repository URL to clone on VM startup (automated deployment)"
  type        = string
  default     = ""  
}
