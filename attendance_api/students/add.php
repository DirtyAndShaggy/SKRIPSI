<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$nim = $data['nim'] ?? '';
$name = $data['name'] ?? '';
$email = $data['email'] ?? null;
$semester = $data['semester'] ?? null;
$academic_year = $data['academic_year'] ?? null;
$fingerprint_id = $data['fingerprint_id'] ?? null;
$cohort_id = $data['cohort_id'] ?? null;
$group_id = $data['group_id'] ?? null;

if (empty($nim) || empty($name)) {
    echo json_encode(["status" => "error", "message" => "NIM and Name required"]);
    exit;
}

$email_value = $email ? "'$email'" : "NULL";
$semester_value = $semester ? "'$semester'" : "NULL";
$academic_year_value = $academic_year ? "'$academic_year'" : "NULL";
$fingerprint_value = $fingerprint_id ? "'$fingerprint_id'" : "NULL";
$cohort_value = $cohort_id ? "'$cohort_id'" : "NULL";
$group_value = $group_id ? "'$group_id'" : "NULL";

$query = "INSERT INTO students (nim, name, email, semester, academic_year, fingerprint_id, cohort_id, group_id) 
          VALUES ('$nim', '$name', $email_value, $semester_value, $academic_year_value, $fingerprint_value, $cohort_value, $group_value)";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "student_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>