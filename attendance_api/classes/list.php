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
    
    // ─── GET GROUPS FOR THIS CLASS ───
    $groupQuery = "
    SELECT 
        cg.group_id,
        cg.group_name,
        cg.group_code,
        cg.lecturer_id,
        cg.capacity,
        cg.semester,
        cg.academic_year,
        cg.is_active,
        l.full_name as lecturer_name,
        (SELECT COUNT(*) FROM student_classes sc WHERE sc.group_id = cg.group_id AND sc.is_active = 1) as student_count
    FROM class_groups cg
    LEFT JOIN lecturers l ON cg.lecturer_id = l.lecturer_id
    WHERE cg.class_id = '{$row['class_id']}' AND cg.is_active = 1
    ORDER BY cg.group_name
    ";
    $groupResult = mysqli_query($conn, $groupQuery);
    $groups = [];
    while ($group = mysqli_fetch_assoc($groupResult)) {
        $groups[] = $group;
    }
    $row['groups'] = $groups;
    
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