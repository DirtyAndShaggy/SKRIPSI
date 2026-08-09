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
    $classFilter = "AND cs.lecturer_id = '$lecturer_id'";
}

// ─── Day mapping ───
$dayMap = [
    'Monday' => 1,
    'Tuesday' => 2,
    'Wednesday' => 3,
    'Thursday' => 4,
    'Friday' => 5,
    'Saturday' => 6,
    'Sunday' => 7
];

// ─── Get semester start dates ───
$semesterQuery = "SELECT DISTINCT semester FROM class_schedules WHERE semester IS NOT NULL AND is_archived = 0";
$semesterResult = mysqli_query($conn, $semesterQuery);
$semesterStartDates = [];
while ($row = mysqli_fetch_assoc($semesterResult)) {
    $sem = $row['semester'];
    $semNum = intval(preg_replace('/[^0-9]/', '', $sem));
    if ($semNum % 2 == 0) {
        $semesterStartDates[$sem] = date('Y') . '-01-01';
    } else {
        $semesterStartDates[$sem] = date('Y') . '-07-01';
    }
}

// Use earliest attendance as fallback
if (empty($semesterStartDates)) {
    $earliestQuery = "SELECT MIN(DATE(timestamp)) as earliest FROM attendance";
    $earliestResult = mysqli_query($conn, $earliestQuery);
    if ($earliestRow = mysqli_fetch_assoc($earliestResult)) {
        $defaultStart = $earliestRow['earliest'] ?? date('Y') . '-07-01';
    } else {
        $defaultStart = date('Y') . '-07-01';
    }
}

$today = new DateTime();
$today->setTime(0, 0, 0);

// ─── Get all schedules ───
$scheduleQuery = "
    SELECT 
        cs.schedule_id,
        cs.class_id,
        cs.group_id,
        cs.day_of_week,
        cs.semester,
        c.class_code,
        c.class_name,
        l.full_name AS lecturer_name,
        l.email AS lecturer_email
    FROM class_schedules cs
    JOIN classes c ON cs.class_id = c.class_id
    LEFT JOIN lecturers l ON cs.lecturer_id = l.lecturer_id
    WHERE cs.is_archived = 0
    $classFilter
";

$scheduleResult = mysqli_query($conn, $scheduleQuery);
if (!$scheduleResult) {
    echo json_encode(['status' => 'error', 'message' => mysqli_error($conn)]);
    exit;
}

$schedules = [];
while ($row = mysqli_fetch_assoc($scheduleResult)) {
    $schedules[] = $row;
}

// ─── Calculate absences per student ───
$studentAbsences = [];

foreach ($schedules as $schedule) {
    $scheduleId = $schedule['schedule_id'];
    $semester = $schedule['semester'];
    $dayOfWeek = $schedule['day_of_week'];
    $classId = $schedule['class_id'];
    
    // Get semester start date
    $startDateStr = $semesterStartDates[$semester] ?? $defaultStart ?? date('Y') . '-07-01';
    $startDate = new DateTime($startDateStr);
    $startDate->setTime(0, 0, 0);
    
    // Find first occurrence of this day
    $dayNum = $dayMap[$dayOfWeek] ?? 1;
    $startDayNum = (int)$startDate->format('N');
    
    $daysToAdd = ($dayNum - $startDayNum + 7) % 7;
    if ($daysToAdd == 0 && $startDate < $today) {
        $firstSession = clone $startDate;
    } else {
        $firstSession = clone $startDate;
        $firstSession->modify("+$daysToAdd days");
    }
    
    // Count sessions
    $sessionCount = 0;
    $currentSession = clone $firstSession;
    while ($currentSession <= $today) {
        $sessionCount++;
        $currentSession->modify('+1 week');
    }
    
    if ($sessionCount == 0) {
        continue;
    }
    
    // ─── Get students for this schedule with emails ───
    $studentsQuery = "
        SELECT 
            s.student_id,
            s.nim,
            s.name AS student_name,
            s.email,
            s.semester AS student_semester
        FROM schedule_students ss
        JOIN students s ON ss.student_id = s.student_id
        WHERE ss.schedule_id = '$scheduleId'
        AND s.email IS NOT NULL
        AND s.email != ''
    ";
    
    $studentsResult = mysqli_query($conn, $studentsQuery);
    if (!$studentsResult) {
        continue;
    }
    
    while ($student = mysqli_fetch_assoc($studentsResult)) {
        $studentId = $student['student_id'];
        $key = $studentId . '_' . $classId;
        
        if (!isset($studentAbsences[$key])) {
            $studentAbsences[$key] = [
                'student_id' => $studentId,
                'student_name' => $student['student_name'],
                'nim' => $student['nim'],
                'email' => $student['email'],
                'student_semester' => $student['student_semester'],
                'class_id' => $classId,
                'class_code' => $schedule['class_code'],
                'class_name' => $schedule['class_name'],
                'lecturer_name' => $schedule['lecturer_name'],
                'lecturer_email' => $schedule['lecturer_email'],
                'total_schedules' => 0,
                'attended_count' => 0,
                'absent_count' => 0,
                'present_count' => 0,
                'late_count' => 0
            ];
        }
        
        // Count attendance
        $attendanceQuery = "
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late
            FROM attendance
            WHERE student_id = '$studentId'
            AND schedule_id = '$scheduleId'
        ";
        $attendanceResult = mysqli_query($conn, $attendanceQuery);
        $attendanceCount = 0;
        $presentCount = 0;
        $lateCount = 0;
        if ($attendanceResult && $row = mysqli_fetch_assoc($attendanceResult)) {
            $attendanceCount = (int)$row['total'];
            $presentCount = (int)$row['present'];
            $lateCount = (int)$row['late'];
        }
        
        $studentAbsences[$key]['total_schedules'] += $sessionCount;
        $studentAbsences[$key]['attended_count'] += $attendanceCount;
        $studentAbsences[$key]['present_count'] += $presentCount;
        $studentAbsences[$key]['late_count'] += $lateCount;
        $studentAbsences[$key]['absent_count'] = 
            $studentAbsences[$key]['total_schedules'] - $studentAbsences[$key]['attended_count'];
    }
}

// ─── Filter and format results ───
$students = [];
foreach ($studentAbsences as $data) {
    if ($data['absent_count'] >= $threshold) {
        $attendancePercentage = $data['total_schedules'] > 0 
            ? round(($data['attended_count'] / $data['total_schedules']) * 100, 1) 
            : 0;
        
        // Check if already notified
        $notifyQuery = "
            SELECT notification_date 
            FROM attendance_notifications 
            WHERE student_id = '{$data['student_id']}' 
            AND class_id = '{$data['class_id']}'
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
            'student_id' => $data['student_id'],
            'student_name' => $data['student_name'],
            'email' => $data['email'],
            'nim' => $data['nim'],
            'class_id' => $data['class_id'],
            'class_code' => $data['class_code'],
            'class_name' => $data['class_name'],
            'lecturer_name' => $data['lecturer_name'],
            'lecturer_email' => $data['lecturer_email'],
            'student_semester' => $data['student_semester'],
            'total_schedules' => $data['total_schedules'],
            'attended_count' => $data['attended_count'],
            'present_count' => $data['present_count'],
            'late_count' => $data['late_count'],
            'absent_count' => $data['absent_count'],
            'attendance_percentage' => $attendancePercentage,
            'last_notified' => $lastNotified
        ];
    }
}

// Sort by absent count descending
usort($students, function($a, $b) {
    return $b['absent_count'] - $a['absent_count'];
});

echo json_encode([
    'status' => 'success',
    'students' => $students,
    'count' => count($students),
    'threshold' => $threshold
]);

mysqli_close($conn);
?>