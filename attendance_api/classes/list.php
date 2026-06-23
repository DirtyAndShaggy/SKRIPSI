<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "
SELECT 
    c.*,
    l.full_name as lecturer_name,
    l.lecturer_code as lecturer_code,
    l.lecturer_id as lecturer_id,
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