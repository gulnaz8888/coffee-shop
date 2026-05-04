
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

output "auth_service_url" {
  description = "Auth Service base URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3001"
}

output "auth_service_health" {
  description = "Auth Service health endpoint"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3001/health"
}

output "reservation_service_url" {
  description = "Reservation Service base URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3002"
}

output "reservation_service_health" {
  description = "Reservation Service health endpoint"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3002/health"
}

output "external_service_url" {
  description = "External Service base URL"
  value       = "http://${google_compute_instance.sre_vm.network_interface[0].access_config[0].nat_ip}:3003"
}

output "machine_type_used" {
  description = "Machine type deployed (for capacity planning documentation)"
  value       = google_compute_instance.sre_vm.machine_type
}
