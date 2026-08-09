<?php
// ─── CORS HEADERS ───
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// ─── Handle preflight OPTIONS request ───
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/EmailService.php';

$data = json_decode(file_get_contents("php://input"), true);
$studentIds = $data['student_ids'] ?? [];
$threshold = $data['threshold'] ?? 3;

if (empty($studentIds)) {
    echo json_encode(['status' => 'error', 'message' => 'No students selected']);
    exit;
}

// ─── Get student details with absence counts ───
$idList = implode(',', array_map('intval', $studentIds));

// Use the same logic as absent_students.php to get accurate counts
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
        COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN a.schedule_id END) AS late_count
    FROM students s
    JOIN schedule_students ss ON s.student_id = ss.student_id
    JOIN class_schedules cs ON ss.schedule_id = cs.schedule_id
    JOIN classes c ON cs.class_id = c.class_id
    LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
    LEFT JOIN attendance a ON s.student_id = a.student_id 
        AND a.schedule_id = ss.schedule_id
        AND a.status IN ('Present', 'Late')
    WHERE s.student_id IN ($idList)
    GROUP BY s.student_id, c.class_id
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
        'present_count' => $row['present_count'],
        'late_count' => $row['late_count'],
        'absent_count' => $absentCount,
        'attendance_percentage' => $attendancePercentage
    ];
}

// ─── Send emails using EmailService ───
$emailService = new EmailService($conn);
$sentCount = 0;
$failedStudents = [];

foreach ($students as $student) {
    $email = $student['email'];
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = $student['nim'] . '@student.unsap.ac.id';
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $failedStudents[] = ['student_id' => $student['student_id'], 'email' => $email, 'reason' => 'Invalid email'];
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
            // Log success
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
            $failedStudents[] = ['student_id' => $student['student_id'], 'email' => $email, 'reason' => 'Send failed'];
            // Log failure
            $logQuery = "
                INSERT INTO attendance_notifications 
                (student_id, class_id, absence_count, attendance_percentage, notification_date, status)
                VALUES (
                    '{$student['student_id']}',
                    '{$student['class_id']}',
                    '{$student['absent_count']}',
                    '{$student['attendance_percentage']}',
                    CURDATE(),
                    'failed'
                )
            ";
            mysqli_query($conn, $logQuery);
        }
    } catch (Exception $e) {
        $failedStudents[] = ['student_id' => $student['student_id'], 'email' => $email, 'reason' => $e->getMessage()];
        // Log failure
        $logQuery = "
            INSERT INTO attendance_notifications 
            (student_id, class_id, absence_count, attendance_percentage, notification_date, status)
            VALUES (
                '{$student['student_id']}',
                '{$student['class_id']}',
                '{$student['absent_count']}',
                '{$student['attendance_percentage']}',
                CURDATE(),
                'failed'
            )
        ";
        mysqli_query($conn, $logQuery);
    }
    
    usleep(100000);
}

echo json_encode([
    'status' => 'success',
    'sent' => $sentCount,
    'failed' => count($failedStudents),
    'total' => count($students),
    'failed_students' => $failedStudents
]);

mysqli_close($conn);
?>