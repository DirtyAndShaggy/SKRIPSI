<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$group_id = $data['group_id'] ?? 0;

// Check if group has students
$checkQuery = "SELECT COUNT(*) as total FROM students WHERE group_id = '$group_id'";
$checkResult = mysqli_query($conn, $checkQuery);
$count = mysqli_fetch_assoc($checkResult);

if ($count['total'] > 0) {
    echo json_encode(["status" => "error", "message" => "Cannot delete group with enrolled students"]);
    exit;
}

$query = "DELETE FROM `groups` WHERE group_id = '$group_id'";
if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>