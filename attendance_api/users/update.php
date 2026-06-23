<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $data['user_id'] ?? 0;
$email = $data['email'] ?? '';
$full_name = $data['full_name'] ?? '';
$role = $data['role'] ?? 'lecturer';
$is_active = $data['is_active'] ?? 1;
$lecturer_id = $data['lecturer_id'] ?? null;

if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "User ID required"]);
    exit;
}

// Check if email is used by another user
$check = "SELECT * FROM users WHERE email = '$email' AND user_id != '$user_id'";
$checkResult = mysqli_query($conn, $check);

if (mysqli_num_rows($checkResult) > 0) {
    echo json_encode(["status" => "error", "message" => "Email already used by another user"]);
    exit;
}

$query = "UPDATE users SET 
          email = '$email',
          full_name = '$full_name',
          role = '$role',
          is_active = '$is_active'
          WHERE user_id = '$user_id'";

if (mysqli_query($conn, $query)) {
    // Update lecturer link if role is lecturer
    if ($role === 'lecturer') {
        // Clear existing lecturer link for this user
        mysqli_query($conn, "UPDATE lecturers SET user_id = NULL WHERE user_id = '$user_id'");
        
        // Link to new lecturer profile if provided
        if ($lecturer_id) {
            mysqli_query($conn, "UPDATE lecturers SET user_id = '$user_id' WHERE lecturer_id = '$lecturer_id'");
        }
    } else {
        // If admin, remove lecturer link
        mysqli_query($conn, "UPDATE lecturers SET user_id = NULL WHERE user_id = '$user_id'");
    }
    
    echo json_encode(["status" => "success", "message" => "User updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>