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
      "3001", # Auth Service
      "3002", # Reservation Service
      "3003", # External Service
      "3004", # Order Service
      "3005", # Notification Service
      "3006", # Product Service
      "4000", # Grafana
      "9090", # Prometheus
    ]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["sre-server"]
}

resource "google_compute_instance" "sre_vm" {
  name         = "sre-vm"
  machine_type = var.machine_type
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
      size  = var.disk_size_gb
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
    echo "[INFO] Starting automated deployment"
    apt-get update -y
    apt-get install -y docker.io docker-compose-plugin git curl
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu
    cd /home/ubuntu
    git clone ${var.repo_url} app || echo "Repo exists"
    if [ -d "app" ]; then
      cd app
      docker compose up -d --build
    fi
    echo "[INFO] Startup script completed"
  EOT

  metadata = {
    ssh-keys = "${var.ssh_user}:${file(var.ssh_pub_key_path)}"
  }
}
