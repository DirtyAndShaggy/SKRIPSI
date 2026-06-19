<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$user_id = $data['user_id'] ?? 0;

if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "User ID required"]);
    exit;
}

// Prevent deleting the last admin
$adminCheck = "SELECT COUNT(*) as total FROM users WHERE role = 'admin' AND user_id != '$user_id'";
$adminResult = mysqli_query($conn, $adminCheck);
$adminCount = mysqli_fetch_assoc($adminResult);

if ($adminCount['total'] == 0) {
    $userQuery = "SELECT role FROM users WHERE user_id = '$user_id'";
    $userResult = mysqli_query($conn, $userQuery);
    $user = mysqli_fetch_assoc($userResult);
    
    if ($user['role'] == 'admin') {
        echo json_encode(["status" => "error", "message" => "Cannot delete the last admin"]);
        exit;
    }
}

$query = "DELETE FROM users WHERE user_id = '$user_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "User deleted"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>