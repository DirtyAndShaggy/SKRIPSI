<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_id = $data['class_id'] ?? 0;
$class_code = $data['class_code'] ?? '';
$class_name = $data['class_name'] ?? '';
$lecturer_name = $data['lecturer_name'] ?? '';

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "Class ID required"]);
    exit;
}

$query = "UPDATE classes SET 
          class_code='$class_code', 
          class_name='$class_name', 
          lecturer_name='$lecturer_name' 
          WHERE class_id='$class_id'";

if (mysqli_query($conn, $query)) {
    // Update rooms if provided
    if (isset($data['room_ids'])) {
        // Remove existing rooms
        mysqli_query($conn, "DELETE FROM class_rooms WHERE class_id = '$class_id'");
        
        // Add new rooms
        foreach ($data['room_ids'] as $room_id) {
            $roomQuery = "INSERT INTO class_rooms (class_id, room_id) VALUES ('$class_id', '$room_id')";
            mysqli_query($conn, $roomQuery);
        }
    }
    
    echo json_encode(["status" => "success", "message" => "Class updated"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>