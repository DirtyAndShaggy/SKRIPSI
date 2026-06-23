<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT room_id, room_code, room_name, building, capacity, created_at 
          FROM rooms 
          ORDER BY room_code ASC";
$result = mysqli_query($conn, $query);

$rooms = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Count how many schedules use this room
    $countQuery = "SELECT COUNT(*) as total FROM class_schedules WHERE room_id = '{$row['room_id']}'";
    $countResult = mysqli_query($conn, $countQuery);
    $count = mysqli_fetch_assoc($countResult);
    $row['schedule_count'] = $count['total'];
    $rooms[] = $row;
}

echo json_encode(["status" => "success", "rooms" => $rooms]);
mysqli_close($conn);
?>