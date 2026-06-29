<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$cohort_id = $data['cohort_id'] ?? 0;
$group_name = $data['group_name'] ?? '';
$group_code = $data['group_code'] ?? '';
$semester = $data['semester'] ?? null;
$academic_year = $data['academic_year'] ?? '';
$capacity = $data['capacity'] ?? null;

if (!$cohort_id || empty($group_name)) {
    echo json_encode(["status" => "error", "message" => "Cohort ID and Group Name required"]);
    exit;
}

$semester_value = $semester ? "'$semester'" : "NULL";
$capacity_value = $capacity ? "'$capacity'" : "NULL";

$query = "INSERT INTO `groups` (cohort_id, group_name, group_code, semester, academic_year, capacity) 
          VALUES ('$cohort_id', '$group_name', '$group_code', $semester_value, '$academic_year', $capacity_value)";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "group_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>