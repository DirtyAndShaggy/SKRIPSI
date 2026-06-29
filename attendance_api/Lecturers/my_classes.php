<?php
include("../cors_headers.php");
include("../config/database.php");

// Get user_id from session or request
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

// Get all groups this lecturer teaches
$query = "
SELECT 
    cg.group_id,
    cg.class_id,
    cg.group_name,
    cg.group_code,
    cg.capacity,
    cg.semester,
    cg.academic_year,
    c.class_code,
    c.class_name,
    c.class_type,
    l.full_name as lecturer_name,
    (SELECT COUNT(*) FROM student_classes sc WHERE sc.group_id = cg.group_id AND sc.is_active = 1) as student_count,
    (SELECT COUNT(*) FROM class_schedules cs WHERE cs.group_id = cg.group_id) as schedule_count
FROM class_groups cg
JOIN classes c ON cg.class_id = c.class_id
LEFT JOIN lecturers l ON cg.lecturer_id = l.lecturer_id
WHERE cg.lecturer_id = '$lecturer_id'
AND cg.is_active = 1
ORDER BY c.class_name, cg.group_name
";

$result = mysqli_query($conn, $query);

$groups = [];
while ($row = mysqli_fetch_assoc($result)) {
    $groups[] = $row;
}

echo json_encode(["status" => "success", "groups" => $groups]);
mysqli_close($conn);
?>