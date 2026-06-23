<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$room_id = $data['room_id'] ?? 0;

if (!$room_id) {
    echo json_encode(["status" => "error", "message" => "Room ID required"]);
    exit;
}

// Check if room is used in schedules
$checkQuery = "SELECT COUNT(*) as total FROM class_schedules WHERE room_id = '$room_id'";
$checkResult = mysqli_query($conn, $checkQuery);
$count = mysqli_fetch_assoc($checkResult);

if ($count['total'] > 0) {
    echo json_encode(["status" => "error", "message" => "Cannot delete room. It is being used in " . $count['total'] . " schedule(s)."]);
    exit;
}

// Also remove from class_rooms junction table
mysqli_query($conn, "DELETE FROM class_rooms WHERE room_id = '$room_id'");

// Delete the room
$query = "DELETE FROM rooms WHERE room_id = '$room_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Room deleted"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>