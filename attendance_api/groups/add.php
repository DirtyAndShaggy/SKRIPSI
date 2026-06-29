<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$group_name = $data['group_name'] ?? '';
$group_code = $data['group_code'] ?? '';
$lecturer_id = $data['lecturer_id'] ?? null;
$capacity = $data['capacity'] ?? null;
$semester = $data['semester'] ?? null;
$academic_year = $data['academic_year'] ?? null;

if (!$class_id || empty($group_name)) {
    echo json_encode(["status" => "error", "message" => "Class ID and Group Name required"]);
    exit;
}

// Check if group code already exists for this class
if ($group_code) {
    $checkQuery = "SELECT group_id FROM class_groups WHERE class_id = '$class_id' AND group_code = '$group_code'";
    $checkResult = mysqli_query($conn, $checkQuery);
    if (mysqli_num_rows($checkResult) > 0) {
        echo json_encode(["status" => "error", "message" => "Group code already exists for this class"]);
        exit;
    }
}

$lecturer_value = $lecturer_id ? "'$lecturer_id'" : "NULL";
$capacity_value = $capacity ? "'$capacity'" : "NULL";
$semester_value = $semester ? "'$semester'" : "NULL";
$academic_year_value = $academic_year ? "'$academic_year'" : "NULL";

$query = "INSERT INTO class_groups (class_id, group_name, group_code, lecturer_id, capacity, semester, academic_year) 
          VALUES ('$class_id', '$group_name', '$group_code', $lecturer_value, $capacity_value, $semester_value, $academic_year_value)";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "group_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>