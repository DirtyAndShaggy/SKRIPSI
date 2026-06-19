<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$schedule_id = $data['schedule_id'] ?? 0;

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "Schedule ID required"]);
    exit;
}

$query = "DELETE FROM class_schedules WHERE schedule_id = '$schedule_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Schedule deleted"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>