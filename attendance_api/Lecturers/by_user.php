<?php
include("../cors_headers.php");
include("../config/database.php");

$user_id = $_GET['user_id'] ?? 0;

if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "user_id required"]);
    exit;
}

$query = "SELECT lecturer_id, lecturer_code, full_name, email, department, specialization, is_active 
          FROM lecturers 
          WHERE user_id = '$user_id' AND is_active = 1
          LIMIT 1";

$result = mysqli_query($conn, $query);

if ($row = mysqli_fetch_assoc($result)) {
    echo json_encode(["status" => "success", "lecturer" => $row]);
} else {
    echo json_encode(["status" => "not_found", "message" => "No lecturer profile found"]);
}

mysqli_close($conn);
?>