<?php
include("../cors_headers.php");
include("../config/database.php");

$schedule_id = $_GET['schedule_id'] ?? null;
$date = $_GET['date'] ?? date("Y-m-d");

if (!$schedule_id) {
    echo json_encode(["status" => "error", "message" => "schedule_id required"]);
    exit;
}

// Get class and schedule info
$classQuery = "
SELECT 
    cs.schedule_id,
    cs.class_id, 
    cs.start_time, 
    cs.end_time, 
    cs.day_of_week,
    c.class_name, 
    c.lecturer_name,
    c.room_name
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.class_id
WHERE cs.schedule_id = '$schedule_id'
";
$classResult = mysqli_query($conn, $classQuery);

if (!$classResult || mysqli_num_rows($classResult) === 0) {
    echo json_encode(["status" => "error", "message" => "Schedule not found"]);
    exit;
}

$classInfo = mysqli_fetch_assoc($classResult);

// Get ALL enrolled students + their attendance status
$query = "
SELECT 
    s.student_id,
    s.nim,
    s.name,
    s.email,
    a.attendance_id,
    a.timestamp as attendance_time,
    a.status as attendance_status,
    CASE 
        WHEN a.attendance_id IS NOT NULL THEN a.status
        ELSE 'Absent'
    END as final_status,
    CASE 
        WHEN a.attendance_id IS NOT NULL 
        THEN DATE_FORMAT(a.timestamp, '%H:%i:%s')
        ELSE NULL
    END as formatted_time
FROM students s
JOIN student_classes sc ON s.student_id = sc.student_id
LEFT JOIN attendance a ON a.student_id = s.student_id 
    AND a.schedule_id = '$schedule_id'
    AND DATE(a.timestamp) = '$date'
WHERE sc.class_id = '{$classInfo['class_id']}'
AND sc.is_active = 1
ORDER BY final_status ASC, 
         CASE final_status
             WHEN 'Present' THEN 1
             WHEN 'Late' THEN 2
             WHEN 'Absent' THEN 3
         END,
         s.name ASC
";

$result = mysqli_query($conn, $query);

if (!$result) {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    exit;
}

$students = [];
$present_count = 0;
$late_count = 0;
$absent_count = 0;

while ($row = mysqli_fetch_assoc($result)) {
    $students[] = $row;
    
    if ($row['final_status'] == 'Present') $present_count++;
    elseif ($row['final_status'] == 'Late') $late_count++;
    else $absent_count++;
}

$total_students = count($students);
$attendance_rate = $total_students > 0 ? round(($present_count + $late_count) / $total_students * 100, 1) : 0;

echo json_encode([
    "status" => "success",
    "date" => $date,
    "schedule_id" => $schedule_id,
    "class_name" => $classInfo['class_name'],
    "lecturer_name" => $classInfo['lecturer_name'],
    "room_name" => $classInfo['room_name'],
    "start_time" => $classInfo['start_time'],
    "end_time" => $classInfo['end_time'],
    "day_of_week" => $classInfo['day_of_week'],
    "summary" => [
        "total_students" => $total_students,
        "present" => $present_count,
        "late" => $late_count,
        "absent" => $absent_count,
        "attendance_rate" => $attendance_rate
    ],
    "students" => $students
]);

mysqli_close($conn);
?>