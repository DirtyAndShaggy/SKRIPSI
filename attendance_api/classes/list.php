<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT c.class_id, c.class_code, c.class_name, c.lecturer_name, 
          (SELECT COUNT(*) FROM student_classes sc WHERE sc.class_id = c.class_id AND sc.is_active = 1) as student_count
          FROM classes c
          ORDER BY c.class_id DESC";
$result = mysqli_query($conn, $query);

$classes = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Get rooms for this class
    $roomQuery = "SELECT r.room_id, r.room_name, r.room_code, r.building 
                  FROM class_rooms cr 
                  JOIN rooms r ON cr.room_id = r.room_id 
                  WHERE cr.class_id = '{$row['class_id']}'";
    $roomResult = mysqli_query($conn, $roomQuery);
    $rooms = [];
    while ($room = mysqli_fetch_assoc($roomResult)) {
        $rooms[] = $room;
    }
    $row['rooms'] = $rooms;
    $classes[] = $row;
}

echo json_encode(["status" => "success", "classes" => $classes]);
mysqli_close($conn);
?>