<?php
include("../cors_headers.php");
include("../config/database.php");

$user_id = $_GET['user_id'] ?? 0;

if (!$user_id) {
    echo json_encode(["status" => "error", "message" => "user_id required"]);
    exit;
}

// Get lecturer_id from user_id
$lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
$lecturerResult = mysqli_query($conn, $lecturerQuery);

if (!$lecturerResult || mysqli_num_rows($lecturerResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Lecturer not found"]);
    exit;
}

$lecturer = mysqli_fetch_assoc($lecturerResult);
$lecturer_id = $lecturer['lecturer_id'];

// ─── GET CLASSES TAUGHT BY THIS LECTURER (VIA SCHEDULES) ───
$query = "
SELECT DISTINCT
    c.class_id,
    c.class_code,
    c.class_name,
    c.class_type,
    c.is_active,
    c.semester_offered,
    (SELECT COUNT(DISTINCT s.student_id) 
     FROM students s 
     JOIN `groups` g ON s.group_id = g.group_id 
     JOIN group_classes gc ON g.group_id = gc.group_id 
     WHERE gc.class_id = c.class_id AND gc.is_active = 1) as student_count,
    (SELECT COUNT(DISTINCT cs.schedule_id) 
     FROM class_schedules cs 
     WHERE cs.class_id = c.class_id AND cs.lecturer_id = '$lecturer_id') as schedule_count
FROM classes c
WHERE c.is_active = 1
AND EXISTS (
    SELECT 1 FROM class_schedules cs 
    WHERE cs.class_id = c.class_id 
    AND cs.lecturer_id = '$lecturer_id'
)
ORDER BY c.class_name ASC
";

$result = mysqli_query($conn, $query);

$classes = [];
while ($row = mysqli_fetch_assoc($result)) {
    $classes[] = $row;
}

echo json_encode(["status" => "success", "classes" => $classes]);
mysqli_close($conn);
?>