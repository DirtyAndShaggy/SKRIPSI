<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "
SELECT 
    c.*,
    l.full_name as lecturer_name,
    l.lecturer_code as lecturer_code,
    (SELECT COUNT(*) FROM student_classes sc WHERE sc.class_id = c.class_id AND sc.is_active = 1) as student_count
FROM classes c
LEFT JOIN lecturers l ON c.lecturer_id = l.lecturer_id
ORDER BY c.class_id DESC
";
$result = mysqli_query($conn, $query);

$classes = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Get rooms for this class
    $roomQuery = "SELECT r.room_id, r.room_code, r.room_name, r.building 
                  FROM class_rooms cr 
                  JOIN rooms r ON cr.room_id = r.room_id 
                  WHERE cr.class_id = '{$row['class_id']}'";
    $roomResult = mysqli_query($conn, $roomQuery);
    $rooms = [];
    while ($room = mysqli_fetch_assoc($roomResult)) {
        $rooms[] = $room;
    }
    $row['rooms'] = $rooms;
    
    // ─── GET GROUPS ASSIGNED TO THIS CLASS ───
    $groupQuery = "
    SELECT 
        g.group_id,
        g.cohort_id,
        g.group_name,
        g.group_code,
        g.semester,
        g.academic_year,
        cg.cohort_name,
        cg.cohort_code,
        (SELECT COUNT(*) FROM students s WHERE s.group_id = g.group_id) as student_count
    FROM group_classes gc
    JOIN `groups` g ON gc.group_id = g.group_id
    JOIN cohorts cg ON g.cohort_id = cg.cohort_id
    WHERE gc.class_id = '{$row['class_id']}' AND gc.is_active = 1
    ORDER BY cg.cohort_name, g.group_name
    ";
    $groupResult = mysqli_query($conn, $groupQuery);
    $assignedGroups = [];
    while ($group = mysqli_fetch_assoc($groupResult)) {
        $assignedGroups[] = $group;
    }
    $row['assigned_groups'] = $assignedGroups;
    
    // Get students for this class
    $studentQuery = "
    SELECT s.student_id, s.nim, s.name, s.semester, s.academic_year, s.fingerprint_id
    FROM student_classes sc
    JOIN students s ON sc.student_id = s.student_id
    WHERE sc.class_id = '{$row['class_id']}' AND sc.is_active = 1
    ORDER BY s.name ASC
    ";
    $studentResult = mysqli_query($conn, $studentQuery);
    $students = [];
    while ($student = mysqli_fetch_assoc($studentResult)) {
        $students[] = $student;
    }
    $row['students'] = $students;
    
    $classes[] = $row;
}

echo json_encode(["status" => "success", "classes" => $classes]);
mysqli_close($conn);
?>