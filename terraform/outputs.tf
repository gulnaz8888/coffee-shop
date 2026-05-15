output "vm_public_ip" {
  description = "Public IP of the SRE VM"
  value       = google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip
}

output "ssh_command" {
  description = "SSH command to connect to VM"
  value       = "ssh ubuntu@${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}"
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:4000"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:9090"
}

output "auth_service_health" {
  description = "Auth Service health endpoint"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3001/health"
}

output "order_service_url" {
  description = "Order Service base URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3004"
}

output "notification_service_url" {
  description = "Notification Service base URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3005"
}

output "product_service_url" {
  description = "Product Service base URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3006"
}

output "machine_type_used" {
  description = "Machine type deployed"
  value       = google_compute_instance.sre_vm.machine_type
}
