<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$room_code = $data['room_code'] ?? '';
$room_name = $data['room_name'] ?? '';
$building = $data['building'] ?? '';
$capacity = $data['capacity'] ?? null;

if (empty($room_code) || empty($room_name)) {
    echo json_encode(["status" => "error", "message" => "Room code and name required"]);
    exit;
}

// Check if room code exists
$checkQuery = "SELECT room_id FROM rooms WHERE room_code = '$room_code'";
$checkResult = mysqli_query($conn, $checkQuery);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Room code already exists"]);
    exit;
}

$capacity_value = $capacity ? "'$capacity'" : "NULL";

$query = "INSERT INTO rooms (room_code, room_name, building, capacity) 
          VALUES ('$room_code', '$room_name', '$building', $capacity_value)";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "room_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>