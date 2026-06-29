<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$group_id = $data['group_id'] ?? 0;
$group_name = $data['group_name'] ?? '';
$group_code = $data['group_code'] ?? '';
$semester = $data['semester'] ?? null;
$academic_year = $data['academic_year'] ?? '';
$capacity = $data['capacity'] ?? null;

if (!$group_id || empty($group_name)) {
    echo json_encode(["status" => "error", "message" => "Group ID and name required"]);
    exit;
}

$semester_value = $semester ? "'$semester'" : "NULL";
$capacity_value = $capacity ? "'$capacity'" : "NULL";

$query = "UPDATE `groups` SET 
          group_name = '$group_name', 
          group_code = '$group_code', 
          semester = $semester_value, 
          academic_year = '$academic_year', 
          capacity = $capacity_value 
          WHERE group_id = '$group_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>