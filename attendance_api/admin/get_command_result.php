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
$command_type = $_GET['command_type'] ?? '';

if (empty($command_type)) {
    echo json_encode(["status" => "error", "message" => "command_type required"]);
    exit;
}

// Get the most recent completed command of this type
$query = "SELECT * FROM admin_commands 
          WHERE device_id = '$device_id' 
          AND command_type = '$command_type' 
          AND status = 'completed' 
          ORDER BY completed_at DESC 
          LIMIT 1";

$result = mysqli_query($conn, $query);

if ($row = mysqli_fetch_assoc($result)) {
    // Parse result to extract slot_list
    $slot_list = '';
    if ($command_type === 'LIST') {
        // Extract slot_list from result or from a separate field
        // For now, we'll use a simple approach
        $slot_list = $row['result'] ?? '';
        // Try to extract slot list from result
        if (preg_match('/slots: (.+)/', $slot_list, $matches)) {
            $slot_list = $matches[1];
        }
    }
    
    echo json_encode([
        "status" => "completed",
        "command_id" => $row['command_id'],
        "result" => $row['result'],
        "slot_list" => $slot_list
    ]);
} else {
    echo json_encode(["status" => "pending"]);
}

mysqli_close($conn);
?>