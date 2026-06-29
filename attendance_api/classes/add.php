<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_code = $data['class_code'] ?? '';
$class_name = $data['class_name'] ?? '';
$lecturer_id = $data['lecturer_id'] ?? null;
$class_type = $data['class_type'] ?? 'Lecture';
$semester_offered = $data['semester_offered'] ?? null;
$is_active = $data['is_active'] ?? 1;
$room_ids = $data['room_ids'] ?? [];

if (empty($class_code) || empty($class_name)) {
    echo json_encode(["status" => "error", "message" => "Class code and name required"]);
    exit;
}

// Check if class code exists
$checkQuery = "SELECT class_id FROM classes WHERE class_code = '$class_code'";
$checkResult = mysqli_query($conn, $checkQuery);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Class code already exists"]);
    exit;
}

$lecturer_value = $lecturer_id ? "'$lecturer_id'" : "NULL";
$semester_value = $semester_offered ? "'$semester_offered'" : "NULL";

$query = "INSERT INTO classes (class_code, class_name, lecturer_id, class_type, semester_offered, is_active) 
          VALUES ('$class_code', '$class_name', $lecturer_value, '$class_type', $semester_value, '$is_active')";

if (mysqli_query($conn, $query)) {
    $class_id = mysqli_insert_id($conn);
    
    //group_id support
    if (!empty($data['group_ids']) && is_array($data['group_ids'])) {
        foreach ($data['group_ids'] as $group_id) {
            $gcQuery = "INSERT INTO group_classes (group_id, class_id, semester) 
                        VALUES ('$group_id', '$class_id', " . ($data['semester_offered'] ? "'{$data['semester_offered']}'" : "NULL") . ")";
            mysqli_query($conn, $gcQuery);
        }
    }

    // Add room assignments
    if (!empty($room_ids) && is_array($room_ids)) {
        foreach ($room_ids as $room_id) {
            $roomQuery = "INSERT INTO class_rooms (class_id, room_id) VALUES ('$class_id', '$room_id')";
            mysqli_query($conn, $roomQuery);
        }
    }
    
    echo json_encode(["status" => "success", "class_id" => $class_id]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>