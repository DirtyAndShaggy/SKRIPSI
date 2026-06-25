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

$action = $_GET['action'] ?? '';

// ─── GET: CHECK FOR PENDING COMMANDS (ESP32 polls this) ───
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
    exit;
}

// ─── GET: HEARTBEAT (ESP32 sends this periodically) ───
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'heartbeat') {
    $device_id = $_GET['device_id'] ?? 'ESP32_01';
    
    // Update last_seen timestamp - ONLY update timestamp, keep status as is
    $update = "UPDATE devices SET last_seen = NOW() WHERE device_id = '$device_id'";
    mysqli_query($conn, $update);
    
    // No need to log heartbeat every time, but log once in a while
    // Optionally log if last_seen was more than 5 minutes ago
    $lastSeenQuery = "SELECT last_seen FROM devices WHERE device_id = '$device_id'";
    $lastSeenResult = mysqli_query($conn, $lastSeenQuery);
    $lastSeenRow = mysqli_fetch_assoc($lastSeenResult);
    
    if ($lastSeenRow && strtotime($lastSeenRow['last_seen']) < strtotime('-5 minutes')) {
        $log = "INSERT INTO attendance_logs (device_id, event_type, message) 
                VALUES ('$device_id', 'heartbeat', 'Device reconnected')";
        mysqli_query($conn, $log);
    }
    
    echo json_encode(["status" => "success", "message" => "Heartbeat received"]);
    exit;
}

// ─── POST: QUEUE A NEW COMMAND (Dashboard calls this) ───
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'queue') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $device_id = $data['device_id'] ?? 'ESP32_01';
    $command_type = $data['command_type'] ?? '';
    $command_value = $data['command_value'] ?? '';
    
    if (empty($command_type)) {
        echo json_encode(["status" => "error", "message" => "command_type required"]);
        exit;
    }
    
    // Check if device exists, if not create it
    $checkDevice = "SELECT device_id FROM devices WHERE device_id = '$device_id'";
    $checkResult = mysqli_query($conn, $checkDevice);
    
    if (mysqli_num_rows($checkResult) === 0) {
        $insertDevice = "INSERT INTO devices (device_id, device_name, status) VALUES ('$device_id', 'ESP32 Attendance', 'offline')";
        mysqli_query($conn, $insertDevice);
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
    exit;
}

// ─── POST: MARK COMMAND AS COMPLETED (ESP32 calls this) ───
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'mark_complete') {
    $data = json_decode(file_get_contents("php://input"), true);
    $command_id = $data['command_id'] ?? 0;
    $command_type = $data['command_type'] ?? '';
    $result = $data['result'] ?? '';
    $slot_list = $data['slot_list'] ?? '';
    $slot_deleted = $data['slot_deleted'] ?? null;
    
    // Update command status with result
    $update = "UPDATE admin_commands 
               SET status = 'completed', 
                   completed_at = NOW(), 
                   result = '$result' 
               WHERE command_id = $command_id";
    
    if (!mysqli_query($conn, $update)) {
        // Log error but continue
        error_log("Failed to update admin_command: " . mysqli_error($conn));
    }
    
    // ─── PING: Update device status ───
    if ($command_type === 'PING') {
        $updateDevice = "UPDATE devices SET status = 'online', last_seen = NOW() WHERE device_id = 'ESP32_01'";
        mysqli_query($conn, $updateDevice);
    }
    
    // ─── LIST: Save the slot list ───
    if ($command_type === 'LIST' && $slot_list) {
        $log = "INSERT INTO attendance_logs (device_id, event_type, message) 
                VALUES ('ESP32_01', 'slot_list', 'Used slots: $slot_list')";
        mysqli_query($conn, $log);
    }
    
    // ─── DELETE_SLOT: Clear student's fingerprint_id ───
    if ($command_type === 'DELETE_SLOT' && $slot_deleted) {
        $studentQuery = "SELECT student_id, name FROM students WHERE fingerprint_id = '$slot_deleted'";
        $studentResult = mysqli_query($conn, $studentQuery);
        $student = mysqli_fetch_assoc($studentResult);
        
        if ($student) {
            $clearQuery = "UPDATE students SET fingerprint_id = NULL WHERE fingerprint_id = '$slot_deleted'";
            mysqli_query($conn, $clearQuery);
            
            $log = "INSERT INTO attendance_logs (device_id, event_type, message) 
                    VALUES ('ESP32_01', 'slot_deleted', 
                    'Slot $slot_deleted cleared from student {$student['name']} (ID: {$student['student_id']})')";
            mysqli_query($conn, $log);
        }
    }
    
    // ─── DELETE_ALL: Clear ALL fingerprint_ids ───
    if ($command_type === 'DELETE_ALL') {
        $clearAll = "UPDATE students SET fingerprint_id = NULL WHERE fingerprint_id IS NOT NULL";
        mysqli_query($conn, $clearAll);
        
        $log = "INSERT INTO attendance_logs (device_id, event_type, message) 
                VALUES ('ESP32_01', 'slot_deleted_all', 'All fingerprint slots cleared from database')";
        mysqli_query($conn, $log);
    }
    
    echo json_encode(["status" => "success"]);
    exit;
}

echo json_encode(["status" => "error", "message" => "Invalid action"]);
mysqli_close($conn);
?>