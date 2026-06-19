<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $data['user_id'] ?? 0;
$new_password = $data['new_password'] ?? '';

if (!$user_id || empty($new_password)) {
    echo json_encode(["status" => "error", "message" => "User ID and new password required"]);
    exit;
}

if (strlen($new_password) < 6) {
    echo json_encode(["status" => "error", "message" => "Password must be at least 6 characters"]);
    exit;
}

$hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

$query = "UPDATE users SET password_hash = '$hashed_password' WHERE user_id = '$user_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Password reset successfully"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>