<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

include("../config/database.php");

// Get all devices
$query = "SELECT device_id, device_name, room_name, ip_address, status, last_seen 
          FROM devices 
          ORDER BY device_id ASC";
$result = mysqli_query($conn, $query);

$devices = [];
while ($row = mysqli_fetch_assoc($result)) {
    $devices[] = $row;
}

// If no devices exist, return a default one
if (empty($devices)) {
    $devices[] = [
        'device_id' => 'ESP32_01',
        'device_name' => 'Node Absensi Lab',
        'room_name' => 'Lab Komputer',
        'ip_address' => '192.168.1.9',
        'status' => 'offline',
        'last_seen' => date('Y-m-d H:i:s')
    ];
}

echo json_encode(["status" => "success", "devices" => $devices]);
mysqli_close($conn);
?>