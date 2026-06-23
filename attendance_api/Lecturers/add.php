<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$lecturer_code = $data['lecturer_code'] ?? '';
$full_name = $data['full_name'] ?? '';
$email = $data['email'] ?? '';
$phone = $data['phone'] ?? '';
$department = $data['department'] ?? '';
$specialization = $data['specialization'] ?? '';
$user_id = $data['user_id'] ?? null;

if (empty($lecturer_code) || empty($full_name)) {
    echo json_encode(["status" => "error", "message" => "Lecturer code and name required"]);
    exit;
}

// Check if lecturer code exists
$checkQuery = "SELECT lecturer_id FROM lecturers WHERE lecturer_code = '$lecturer_code'";
$checkResult = mysqli_query($conn, $checkQuery);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Lecturer code already exists"]);
    exit;
}

$user_value = $user_id ? "'$user_id'" : "NULL";
$phone_value = $phone ? "'$phone'" : "NULL";
$department_value = $department ? "'$department'" : "NULL";
$specialization_value = $specialization ? "'$specialization'" : "NULL";
$email_value = $email ? "'$email'" : "NULL";

$query = "INSERT INTO lecturers (lecturer_code, full_name, email, phone, department, specialization, user_id) 
          VALUES ('$lecturer_code', '$full_name', $email_value, $phone_value, $department_value, $specialization_value, $user_value)";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "lecturer_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>