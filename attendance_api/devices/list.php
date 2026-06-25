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

// Get current time for comparison
$now = time();

$query = "SELECT device_id, device_name, room_name, ip_address, status, last_seen 
          FROM devices 
          ORDER BY device_id ASC";
$result = mysqli_query($conn, $query);

$devices = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Calculate online status based on last_seen
    $lastSeenTimestamp = strtotime($row['last_seen']);
    $diffSeconds = $now - $lastSeenTimestamp;
    
    // Device is online if last_seen was within the last 60 seconds
    $calculatedStatus = ($diffSeconds < 60) ? 'online' : 'offline';
    
    // Update database status if it changed
    if ($calculatedStatus !== $row['status']) {
        $update = "UPDATE devices SET status = '$calculatedStatus' WHERE device_id = '{$row['device_id']}'";
        mysqli_query($conn, $update);
        $row['status'] = $calculatedStatus;
    } else {
        $row['status'] = $calculatedStatus;
    }
    
    // Add debug info for troubleshooting
    $row['last_seen_formatted'] = $row['last_seen'];
    $row['seconds_ago'] = $diffSeconds;
    $row['is_online'] = ($diffSeconds < 60);
    
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
        'last_seen' => date('Y-m-d H:i:s', strtotime('-5 minutes')),
        'last_seen_formatted' => date('Y-m-d H:i:s', strtotime('-5 minutes')),
        'seconds_ago' => 300,
        'is_online' => false
    ];
}

echo json_encode(["status" => "success", "devices" => $devices]);
mysqli_close($conn);
?>