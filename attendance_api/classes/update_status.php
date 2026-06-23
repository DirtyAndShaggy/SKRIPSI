<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$is_active = $data['is_active'] ?? 1;

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "Class ID required"]);
    exit;
}

$query = "UPDATE classes SET is_active = '$is_active' WHERE class_id = '$class_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Class status updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>