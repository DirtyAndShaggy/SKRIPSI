<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$student_id = $data['id'] ?? 0;
$nim = $data['nim'] ?? '';
$name = $data['name'] ?? '';
$email = $data['email'] ?? null;
$semester = $data['semester'] ?? null;
$academic_year = $data['academic_year'] ?? null;
$fingerprint_id = $data['fingerprint_id'] ?? null;

if (!$student_id) {
    echo json_encode(["status" => "error", "message" => "Student ID required"]);
    exit;
}

$email_value = $email ? "'$email'" : "NULL";
$semester_value = $semester ? "'$semester'" : "NULL";
$academic_year_value = $academic_year ? "'$academic_year'" : "NULL";
$fingerprint_value = $fingerprint_id ? "'$fingerprint_id'" : "NULL";

$query = "UPDATE students SET 
          nim = '$nim',
          name = '$name',
          email = $email_value,
          semester = $semester_value,
          academic_year = $academic_year_value,
          fingerprint_id = $fingerprint_value
          WHERE student_id = '$student_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>