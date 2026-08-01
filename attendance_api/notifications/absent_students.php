<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

require_once __DIR__ . '/../config/database.php';

$user_id = $_GET['user_id'] ?? 0;
$threshold = $_GET['threshold'] ?? 3;
$class_id = $_GET['class_id'] ?? null;
$role = $_GET['role'] ?? 'lecturer';

// ─── Get lecturer_id (if lecturer) ───
$lecturer_id = null;
if ($role === 'lecturer' && $user_id) {
    $lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
    $lecturerResult = mysqli_query($conn, $lecturerQuery);
    if ($lecturerRow = mysqli_fetch_assoc($lecturerResult)) {
        $lecturer_id = $lecturerRow['lecturer_id'];
    }
}

// ─── Build class filter ───
$classFilter = "";
if ($class_id) {
    $classFilter = "AND c.class_id = '$class_id'";
} elseif ($lecturer_id) {
    // Lecturer: only their schedules (lecturer_id on class_schedules)
    $classFilter = "AND cs.lecturer_id = '$lecturer_id'";
}

// ─── Get students with absences exceeding threshold ───
$query = "
    SELECT 
        s.student_id,
        s.nim,
        s.name AS student_name,
        s.email,
        s.semester AS student_semester,
        c.class_id,
        c.class_code,
        c.class_name,
        l.full_name AS lecturer_name,
        l.email AS lecturer_email,
        COUNT(DISTINCT ss.schedule_id) AS total_schedules,
        COUNT(DISTINCT a.attendance_id) AS attended_count,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.schedule_id END) AS present_count,
        COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN a.schedule_id END) AS late_count,
        GROUP_CONCAT(DISTINCT DATE(a.timestamp) ORDER BY a.timestamp ASC) AS absence_dates
    FROM students s
    JOIN schedule_students ss ON s.student_id = ss.student_id
    JOIN class_schedules cs ON ss.schedule_id = cs.schedule_id
    JOIN classes c ON cs.class_id = c.class_id
    LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
    LEFT JOIN attendance a ON s.student_id = a.student_id 
        AND a.schedule_id = ss.schedule_id
        AND a.status IN ('Present', 'Late')
    WHERE 1=1
    $classFilter
    AND s.email IS NOT NULL
    AND s.email != ''
    GROUP BY s.student_id, c.class_id
    HAVING (total_schedules - attended_count) >= $threshold
    ORDER BY (total_schedules - attended_count) DESC, s.name ASC
";

$result = mysqli_query($conn, $query);

if (!$result) {
    echo json_encode(['status' => 'error', 'message' => mysqli_error($conn)]);
    exit;
}

$students = [];

while ($row = mysqli_fetch_assoc($result)) {
    $enrolled = $row['total_schedules'];
    $attended = $row['attended_count'];
    $absentCount = $enrolled - $attended;
    $attendancePercentage = $enrolled > 0 ? round(($attended / $enrolled) * 100, 1) : 0;
    
    // Check if already notified recently (7 days)
    $notifyQuery = "
        SELECT notification_date 
        FROM attendance_notifications 
        WHERE student_id = '{$row['student_id']}' 
        AND class_id = '{$row['class_id']}'
        AND status = 'sent'
        ORDER BY notification_date DESC 
        LIMIT 1
    ";
    $notifyResult = mysqli_query($conn, $notifyQuery);
    $lastNotified = null;
    if ($notifyRow = mysqli_fetch_assoc($notifyResult)) {
        $lastNotified = $notifyRow['notification_date'];
    }
    
    $students[] = [
        'student_id' => $row['student_id'],
        'student_name' => $row['student_name'],
        'email' => $row['email'],
        'nim' => $row['nim'],
        'class_id' => $row['class_id'],
        'class_code' => $row['class_code'],
        'class_name' => $row['class_name'],
        'lecturer_name' => $row['lecturer_name'],
        'lecturer_email' => $row['lecturer_email'],
        'student_semester' => $row['student_semester'],
        'total_schedules' => $enrolled,
        'attended_count' => $attended,
        'present_count' => $row['present_count'],
        'late_count' => $row['late_count'],
        'absent_count' => $absentCount,
        'attendance_percentage' => $attendancePercentage,
        'absence_dates' => $row['absence_dates'],
        'last_notified' => $lastNotified
    ];
}

echo json_encode([
    'status' => 'success',
    'students' => $students,
    'count' => count($students),
    'threshold' => $threshold
]);

mysqli_close($conn);
?>