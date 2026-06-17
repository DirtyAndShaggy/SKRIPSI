<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Email and password required"]);
    exit;
}

// MODIFIED: Direct comparison for testing
$query = "SELECT user_id, email, full_name, role, password_hash FROM users WHERE email = '$email' AND is_active = 1";
$result = mysqli_query($conn, $query);

if ($row = mysqli_fetch_assoc($result)) {
    // TEMPORARY: Direct string comparison instead of password_verify()
    // This is for testing only! Remove this after testing
    if ($password === $row['password_hash'] || password_verify($password, $row['password_hash'])) {
        echo json_encode([
            "status" => "success",
            "user_id" => $row['user_id'],
            "name" => $row['full_name'],
            "role" => $row['role']
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid password"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "User not found"]);
}

mysqli_close($conn);
?>