
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}


resource "google_compute_firewall" "sre_firewall" {
  name    = "sre-firewall"
  network = "default"

  allow {
    protocol = "tcp"
    ports = [
      "22",   # SSH
      "80",   # Nginx / Frontend
      "3001", # Auth Service        (Assignment 6: added)
      "3002", # Reservation Service (Assignment 6: added)
      "3003", # External Service    (Assignment 6: added)
      "4000", # Grafana             (Assignment 6: changed from 3000)
      "9090", # Prometheus
    ]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["sre-server"]
}

# ─────────────────────────────────────────────
# COMPUTE INSTANCE
# Assignment 6 changes:
#   - machine_type: e2-medium → e2-standard-2
#     (2 vCPU, 8GB RAM — supports load testing without OOM)
#   - disk size: 20GB → 30GB
#     (extra space for Docker images + load test logs)
#   - labels added for cost tracking and monitoring
#   - startup_script fully provisions the stack automatically
#
# Vertical scaling note:
#   To scale up further, change machine_type to:
#     e2-standard-4  → 4 vCPU, 16GB RAM
#     e2-standard-8  → 8 vCPU, 32GB RAM
#   Then run: terraform apply
# ─────────────────────────────────────────────
resource "google_compute_instance" "sre_vm" {
  name         = "sre-vm"
  machine_type = var.machine_type   # default: e2-standard-2
  zone         = var.zone
  tags         = ["sre-server"]

  labels = {
    environment = "sre-assignment-6"
    managed-by  = "terraform"
    course      = "site-reliability-engineering"
  }

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.disk_size_gb     # default: 30
      type  = "pd-ssd"             
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }


  metadata_startup_script = <<-EOT
    #!/bin/bash
    set -e

    echo "[INFO] Starting automated deployment - Assignment 6"

    apt-get update -y
    apt-get install -y docker.io docker-compose-plugin git curl

    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu

  
    apt-get install -y apache2-utils

   
    cd /home/ubuntu
    git clone ${var.repo_url} app || echo "[WARN] Repo already exists or URL not set"

  
    if [ -d "app" ]; then
      cd app
      cp .env.example .env || echo "[WARN] No .env.example found"
      docker compose up -d --build
      echo "[INFO] Stack deployed successfully"
    fi

    echo "[INFO] Startup script completed"
  EOT

  metadata = {
    ssh-keys = "${var.ssh_user}:${file(var.ssh_pub_key_path)}"
  }
}
