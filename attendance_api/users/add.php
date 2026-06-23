<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$full_name = $data['full_name'] ?? '';
$role = $data['role'] ?? 'lecturer';
$lecturer_id = $data['lecturer_id'] ?? null;

if (empty($email) || empty($password) || empty($full_name)) {
    echo json_encode(["status" => "error", "message" => "All fields required"]);
    exit;
}

// Check if email exists
$check = "SELECT * FROM users WHERE email = '$email'";
$checkResult = mysqli_query($conn, $check);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Email already exists"]);
    exit;
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);

$query = "INSERT INTO users (email, password_hash, full_name, role) 
          VALUES ('$email', '$hashed_password', '$full_name', '$role')";

if (mysqli_query($conn, $query)) {
    $user_id = mysqli_insert_id($conn);
    
    // If lecturer, link to lecturer profile
    if ($role === 'lecturer' && $lecturer_id) {
        $updateLecturer = "UPDATE lecturers SET user_id = '$user_id' WHERE lecturer_id = '$lecturer_id'";
        mysqli_query($conn, $updateLecturer);
    }
    
    echo json_encode(["status" => "success", "user_id" => $user_id]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>