<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$class_code = $data['class_code'] ?? '';
$class_name = $data['class_name'] ?? '';
$lecturer_id = $data['lecturer_id'] ?? null;
$class_type = $data['class_type'] ?? 'Lecture';
$semester_offered = $data['semester_offered'] ?? null;
$is_active = $data['is_active'] ?? 1;
$room_ids = $data['room_ids'] ?? [];

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "Class ID required"]);
    exit;
}

$lecturer_value = $lecturer_id ? "'$lecturer_id'" : "NULL";
$semester_value = $semester_offered ? "'$semester_offered'" : "NULL";

$query = "UPDATE classes SET 
          class_code = '$class_code',
          class_name = '$class_name',
          lecturer_id = $lecturer_value,
          class_type = '$class_type',
          semester_offered = $semester_value,
          is_active = '$is_active'
          WHERE class_id = '$class_id'";

if (mysqli_query($conn, $query)) {
    // Update room assignments
    mysqli_query($conn, "DELETE FROM class_rooms WHERE class_id = '$class_id'");
    
    if (!empty($room_ids) && is_array($room_ids)) {
        foreach ($room_ids as $room_id) {
            $roomQuery = "INSERT INTO class_rooms (class_id, room_id) VALUES ('$class_id', '$room_id')";
            mysqli_query($conn, $roomQuery);
        }
    }
    
    echo json_encode(["status" => "success", "message" => "Class updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>