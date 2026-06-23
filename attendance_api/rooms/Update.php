<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$room_id = $data['room_id'] ?? 0;
$room_code = $data['room_code'] ?? '';
$room_name = $data['room_name'] ?? '';
$building = $data['building'] ?? '';
$capacity = $data['capacity'] ?? null;

if (!$room_id) {
    echo json_encode(["status" => "error", "message" => "Room ID required"]);
    exit;
}

if (empty($room_code) || empty($room_name)) {
    echo json_encode(["status" => "error", "message" => "Room code and name required"]);
    exit;
}

// Check if room code is used by another room
$checkQuery = "SELECT room_id FROM rooms WHERE room_code = '$room_code' AND room_id != '$room_id'";
$checkResult = mysqli_query($conn, $checkQuery);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Room code already used by another room"]);
    exit;
}

$capacity_value = $capacity ? "'$capacity'" : "NULL";

$query = "UPDATE rooms SET 
          room_code = '$room_code', 
          room_name = '$room_name', 
          building = '$building', 
          capacity = $capacity_value 
          WHERE room_id = '$room_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Room updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>