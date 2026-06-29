<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$group_id = $data['group_id'] ?? 0;
$is_active = $data['is_active'] ?? 1;

if (!$group_id) {
    echo json_encode(["status" => "error", "message" => "Group ID required"]);
    exit;
}

$query = "UPDATE `groups` SET is_active = '$is_active' WHERE group_id = '$group_id'";
if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>