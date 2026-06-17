<?php
include("../cors_headers.php");
include("../config/database.php");
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include("../config/database.php");

$action = $_GET['action'] ?? '';

// GET: Check for pending commands
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get_commands') {
    $device_id = $_GET['device_id'] ?? 'ESP32_01';
    
    $query = "SELECT * FROM admin_commands 
              WHERE device_id = '$device_id' AND status = 'pending'
              ORDER BY command_id ASC LIMIT 1";
    
    $result = mysqli_query($conn, $query);
    
    if ($result && mysqli_num_rows($result) > 0) {
        $command = mysqli_fetch_assoc($result);
        echo json_encode([
            "status" => "pending",
            "command_id" => $command['command_id'],
            "command_type" => $command['command_type'],
            "command_value" => $command['command_value']
        ]);
    } else {
        echo json_encode(["status" => "none"]);
    }
}

// POST: Mark command as completed
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'mark_complete') {
    $data = json_decode(file_get_contents("php://input"), true);
    $command_id = $data['command_id'] ?? 0;
    
    $update = "UPDATE admin_commands 
               SET status = 'completed', completed_at = NOW() 
               WHERE command_id = $command_id";
    
    if (mysqli_query($conn, $update)) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
}

// POST: Queue a new command (for your dashboard)
elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'queue') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $device_id = $data['device_id'] ?? 'ESP32_01';
    $command_type = $data['command_type'] ?? '';
    $command_value = $data['command_value'] ?? '';
    
    if (empty($command_type)) {
        echo json_encode(["status" => "error", "message" => "command_type required"]);
        exit;
    }
    
    $insert = "INSERT INTO admin_commands (device_id, command_type, command_value) 
               VALUES ('$device_id', '$command_type', '$command_value')";
    
    if (mysqli_query($conn, $insert)) {
        echo json_encode([
            "status" => "success", 
            "message" => "Command queued",
            "command_id" => mysqli_insert_id($conn)
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
}

else {
    echo json_encode(["status" => "error", "message" => "Invalid action"]);
}

mysqli_close($conn);
?>