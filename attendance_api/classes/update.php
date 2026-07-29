<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$class_code = $data['class_code'] ?? '';
$class_name = $data['class_name'] ?? '';
$class_type = $data['class_type'] ?? 'Lecture';
$semester_offered = $data['semester_offered'] ?? null;
$is_active = $data['is_active'] ?? 1;
$room_ids = $data['room_ids'] ?? [];
$group_ids = $data['group_ids'] ?? [];

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "Class ID required"]);
    exit;
}

$semester_value = $semester_offered ? "'$semester_offered'" : "NULL";

$query = "UPDATE classes SET 
          class_code = '$class_code',
          class_name = '$class_name',
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
    
    // ─── UPDATE GROUP ASSIGNMENTS ───
    mysqli_query($conn, "DELETE FROM group_classes WHERE class_id = '$class_id'");
    
    if (!empty($group_ids) && is_array($group_ids)) {
        foreach ($group_ids as $group_id) {
            $gcQuery = "INSERT INTO group_classes (group_id, class_id, semester, is_active) 
                        VALUES ('$group_id', '$class_id', $semester_value, 1)";
            mysqli_query($conn, $gcQuery);
        }
    }
    
    echo json_encode(["status" => "success", "message" => "Class updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>