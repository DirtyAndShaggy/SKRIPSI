<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT class_id, class_code, class_name, lecturer_name, room_name FROM classes ORDER BY class_id DESC";
$result = mysqli_query($conn, $query);

$classes = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Get enrolled student count
    $countQuery = "SELECT COUNT(*) as total FROM student_classes WHERE class_id = '{$row['class_id']}' AND is_active = 1";
    $countResult = mysqli_query($conn, $countQuery);
    $count = mysqli_fetch_assoc($countResult);
    $row['student_count'] = $count['total'];
    $classes[] = $row;
}

echo json_encode(["status" => "success", "classes" => $classes]);
mysqli_close($conn);
?>