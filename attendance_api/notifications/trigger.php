<?php
/**
 * Manual trigger for absence notifications
 * GET /notifications/trigger.php?user_id=1&role=admin&threshold=3
 */

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/EmailService.php';

$user_id = $_GET['user_id'] ?? 0;
$role = $_GET['role'] ?? 'admin';
$threshold = $_GET['threshold'] ?? 3;
$test_mode = isset($_GET['test']) && $_GET['test'] === 'true';

// ─── Get lecturer_id (if lecturer) ───
$lecturer_id = null;
if ($role === 'lecturer' && $user_id) {
    $lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
    $lecturerResult = mysqli_query($conn, $lecturerQuery);
    if ($lecturerRow = mysqli_fetch_assoc($lecturerResult)) {
        $lecturer_id = $lecturerRow['lecturer_id'];
    }
}

$classFilter = "";
if ($lecturer_id) {
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
        (COUNT(DISTINCT ss.schedule_id) - COUNT(DISTINCT a.attendance_id)) as absent_count,
        ROUND((COUNT(DISTINCT a.attendance_id) / COUNT(DISTINCT ss.schedule_id)) * 100, 1) as attendance_percentage
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
    HAVING absent_count >= $threshold
    ORDER BY absent_count DESC, s.name ASC
";

$result = mysqli_query($conn, $query);
$students = [];

while ($row = mysqli_fetch_assoc($result)) {
    $students[] = $row;
}

if (empty($students)) {
    echo json_encode([
        'status' => 'success',
        'message' => 'No students with repetitive absences found',
        'students' => [],
        'count' => 0
    ]);
    mysqli_close($conn);
    exit;
}

// ─── For test mode, just return the list ───
if ($test_mode) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Test mode - No emails sent',
        'students' => $students,
        'count' => count($students)
    ]);
    mysqli_close($conn);
    exit;
}

// ─── Send emails ───
$emailService = new EmailService($conn);
$sentCount = 0;
$failedCount = 0;

foreach ($students as $student) {
    $email = $student['email'];
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = $student['nim'] . '@student.unsap.ac.id';
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $failedCount++;
        continue;
    }
    
    try {
        $result = $emailService->sendAbsenceNotification(
            $student['student_id'],
            $student['student_name'],
            $email,
            $student['nim'],
            $student['class_name'],
            $student['class_code'],
            $student['absent_count'],
            $student['attendance_percentage'],
            $student['lecturer_name']
        );
        
        if ($result) {
            $logQuery = "
                INSERT INTO attendance_notifications 
                (student_id, class_id, absence_count, attendance_percentage, notification_date, status)
                VALUES (
                    '{$student['student_id']}',
                    '{$student['class_id']}',
                    '{$student['absent_count']}',
                    '{$student['attendance_percentage']}',
                    CURDATE(),
                    'sent'
                )
            ";
            mysqli_query($conn, $logQuery);
            $sentCount++;
        } else {
            $failedCount++;
        }
    } catch (Exception $e) {
        $failedCount++;
    }
    
    usleep(100000); // Rate limiting
}

echo json_encode([
    'status' => 'success',
    'message' => "Notifications sent",
    'sent' => $sentCount,
    'failed' => $failedCount,
    'total' => count($students)
]);

mysqli_close($conn);
?>