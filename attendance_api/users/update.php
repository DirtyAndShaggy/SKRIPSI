<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $data['user_id'] ?? 0;
$email = $data['email'] ?? '';
$full_name = $data['full_name'] ?? '';
$role = $data['role'] ?? 'lecturer';

if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "User ID required"]);
    exit;
}

$query = "UPDATE users SET email='$email', full_name='$full_name', role='$role' WHERE user_id='$user_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "User updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>