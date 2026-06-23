<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$lecturer_id = $data['lecturer_id'] ?? 0;
$lecturer_code = $data['lecturer_code'] ?? '';
$full_name = $data['full_name'] ?? '';
$email = $data['email'] ?? null;
$phone = $data['phone'] ?? null;
$department = $data['department'] ?? null;
$specialization = $data['specialization'] ?? null;
$is_active = $data['is_active'] ?? 1;

if (!$lecturer_id) {
    echo json_encode(["status" => "error", "message" => "Lecturer ID required"]);
    exit;
}

$email_value = $email ? "'$email'" : "NULL";
$phone_value = $phone ? "'$phone'" : "NULL";
$department_value = $department ? "'$department'" : "NULL";
$specialization_value = $specialization ? "'$specialization'" : "NULL";

// Ensure is_active is integer
$status_value = $is_active ? 1 : 0;

$query = "UPDATE lecturers SET 
          lecturer_code = '$lecturer_code',
          full_name = '$full_name',
          email = $email_value,
          phone = $phone_value,
          department = $department_value,
          specialization = $specialization_value,
          is_active = $status_value
          WHERE lecturer_id = '$lecturer_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Lecturer updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>