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

$device_id = $_GET['device_id'] ?? 'ESP32_01';

$query = "SELECT device_id, status, last_seen FROM devices WHERE device_id = '$device_id'";
$result = mysqli_query($conn, $query);

if ($row = mysqli_fetch_assoc($result)) {
    echo json_encode(["status" => "success", "device" => $row]);
} else {
    // Device not found, return offline status
    echo json_encode([
        "status" => "success", 
        "device" => [
            "device_id" => $device_id,
            "status" => "offline",
            "last_seen" => null
        ]
    ]);
}

mysqli_close($conn);
?>