<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$room_id = $data['room_id'] ?? null;
$day_of_week = $data['day_of_week'] ?? '';
$start_time = $data['start_time'] ?? '';
$end_time = $data['end_time'] ?? '';
$device_id = $data['device_id'] ?? 'ESP32_01';

if (!$class_id || !$day_of_week || !$start_time || !$end_time) {
    echo json_encode(["status" => "error", "message" => "All fields are required"]);
    exit;
}

$room_value = $room_id ? "'$room_id'" : "NULL";

$query = "INSERT INTO class_schedules (class_id, room_id, day_of_week, start_time, end_time, device_id) 
          VALUES ('$class_id', $room_value, '$day_of_week', '$start_time', '$end_time', '$device_id')";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "schedule_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>