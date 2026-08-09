#!/usr/bin/env php
<?php
/**
 * Cron Job: Check for absences and send notifications
 * 
 * This integrates with the existing notification system
 * Run: php /path/to/attendance_api/cron/check_absences.php
 * 
 * Cron setup (daily at 8 AM):
 * 0 8 * * * /usr/bin/php /path/to/attendance_api/cron/check_absences.php >> /path/to/attendance_api/logs/notification.log 2>&1
 */

// ─── Configuration ───
date_default_timezone_set('Asia/Jakarta');

$basePath = dirname(__DIR__);
chdir($basePath);

define('ABSENCE_THRESHOLD', 3);
define('NOTIFICATION_GRACE_DAYS', 7);
define('LOG_FILE', $basePath . '/logs/notification.log');

// ─── Ensure log directory exists ───
$logDir = dirname(LOG_FILE);
if (!is_dir($logDir)) {
    mkdir($logDir, 0777, true);
}

// ─── Logging function ───
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message\n";
    echo $logEntry;
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND);
}

logMessage("=== STARTING ABSENCE CHECK ===");

// ─── Include dependencies ───
require_once $basePath . '/config/database.php';

// ─── PHPMailer setup (using your existing path) ───
$phpmailerPath = $basePath . '/vendor/phpmailer/PHPMailer-6.9.1/src/';

if (file_exists($phpmailerPath . 'PHPMailer.php')) {
    require_once $phpmailerPath . 'PHPMailer.php';
    require_once $phpmailerPath . 'SMTP.php';
    require_once $phpmailerPath . 'Exception.php';
    logMessage("PHPMailer loaded successfully");
} else {
    logMessage("PHPMailer not found at: $phpmailerPath", 'ERROR');
    logMessage("Please ensure PHPMailer is installed in vendor/phpmailer/PHPMailer-6.9.1/", 'ERROR');
    exit(1);
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ─── SMTP Configuration ───
// !!! UPDATE THESE WITH YOUR ACTUAL SMTP SETTINGS !!!
$smtpConfig = [
    'host' => 'smtp.gmail.com',
    'port' => 587,
    'username' => getenv('SMTP_USERNAME') ?: '220660121075@student.unsap.ac.id',
    'password' => getenv('SMTP_PASSWORD') ?: 'epqp rmks khbj znwf',
    'from_email' => 'noreply@unsap.ac.id',
    'from_name' => 'Attendance System - UNSAP'
];

if ($smtpConfig['username'] === 'your-email@gmail.com') {
    logMessage("WARNING: Using default SMTP credentials. Please update them.", 'WARNING');
}

// ─── Get semester start dates ───
logMessage("Determining semester start dates...");

$semesterQuery = "SELECT DISTINCT semester FROM class_schedules WHERE semester IS NOT NULL AND is_archived = 0";
$semesterResult = mysqli_query($conn, $semesterQuery);

$semesterStartDates = [];
while ($row = mysqli_fetch_assoc($semesterResult)) {
    $sem = $row['semester'];
    $semNum = intval(preg_replace('/[^0-9]/', '', $sem));
    
    // Even semester (2,4,6,8) starts in January, Odd starts in July
    if ($semNum % 2 == 0) {
        $semesterStartDates[$sem] = date('Y') . '-01-01';
    } else {
        $semesterStartDates[$sem] = date('Y') . '-07-01';
    }
    logMessage("Semester $sem: start date = {$semesterStartDates[$sem]}");
}

// If no semester data, use earliest attendance or default
if (empty($semesterStartDates)) {
    $earliestQuery = "SELECT MIN(DATE(timestamp)) as earliest FROM attendance";
    $earliestResult = mysqli_query($conn, $earliestQuery);
    if ($earliestRow = mysqli_fetch_assoc($earliestResult)) {
        $defaultStart = $earliestRow['earliest'] ?? '2026-07-01';
        logMessage("Using earliest attendance date as reference: $defaultStart");
    } else {
        $defaultStart = '2026-07-01';
    }
}

// ─── Get all schedules ───
logMessage("Fetching schedule information...");

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
";

$scheduleResult = mysqli_query($conn, $scheduleQuery);
if (!$scheduleResult) {
    logMessage("Error fetching schedules: " . mysqli_error($conn), 'ERROR');
    mysqli_close($conn);
    exit(1);
}

$schedules = [];
while ($row = mysqli_fetch_assoc($scheduleResult)) {
    $schedules[] = $row;
}

logMessage("Found " . count($schedules) . " active schedules");

// ─── Map days to numbers ───
$dayMap = [
    'Monday' => 1,
    'Tuesday' => 2,
    'Wednesday' => 3,
    'Thursday' => 4,
    'Friday' => 5,
    'Saturday' => 6,
    'Sunday' => 7
];

$today = new DateTime();
$today->setTime(0, 0, 0);

// ─── Calculate absences per student ───
logMessage("Calculating absences per student...");

$studentAbsences = [];

foreach ($schedules as $schedule) {
    $scheduleId = $schedule['schedule_id'];
    $semester = $schedule['semester'];
    $dayOfWeek = $schedule['day_of_week'];
    $classId = $schedule['class_id'];
    
    // Get semester start date
    $startDateStr = $semesterStartDates[$semester] ?? $defaultStart ?? '2026-07-01';
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
    
    logMessage("Schedule ID $scheduleId: $dayOfWeek, $sessionCount sessions from " . $firstSession->format('Y-m-d'));
    
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
                'expected_sessions' => 0,
                'attended_count' => 0,
                'absent_count' => 0
            ];
        }
        
        // Count attendance
        $attendanceQuery = "
            SELECT COUNT(*) as count
            FROM attendance
            WHERE student_id = '$studentId'
            AND schedule_id = '$scheduleId'
            AND status IN ('Present', 'Late')
        ";
        $attendanceResult = mysqli_query($conn, $attendanceQuery);
        $attendanceCount = 0;
        if ($attendanceResult && $row = mysqli_fetch_assoc($attendanceResult)) {
            $attendanceCount = (int)$row['count'];
        }
        
        $studentAbsences[$key]['expected_sessions'] += $sessionCount;
        $studentAbsences[$key]['attended_count'] += $attendanceCount;
        $studentAbsences[$key]['absent_count'] = 
            $studentAbsences[$key]['expected_sessions'] - $studentAbsences[$key]['attended_count'];
    }
}

logMessage("Found " . count($studentAbsences) . " student-class combinations");

// ─── Filter students with absences above threshold ───
$studentsToNotify = [];
$totalFound = 0;

foreach ($studentAbsences as $key => $data) {
    if ($data['absent_count'] >= ABSENCE_THRESHOLD) {
        $totalFound++;
        $attendancePercentage = $data['expected_sessions'] > 0 
            ? round(($data['attended_count'] / $data['expected_sessions']) * 100, 1) 
            : 0;
        
        logMessage("Found: {$data['student_name']} (NIM: {$data['nim']}) - Class: {$data['class_code']} - Absences: {$data['absent_count']}/{$data['expected_sessions']} sessions");
        
        // Check if already notified recently (grace period)
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
        
        if ($lastNotified) {
            $daysSince = (strtotime(date('Y-m-d')) - strtotime($lastNotified)) / (60 * 60 * 24);
            if ($daysSince < NOTIFICATION_GRACE_DAYS) {
                logMessage("  → Skipped (notified $daysSince days ago)");
                continue;
            }
        }
        
        $data['attendance_percentage'] = $attendancePercentage;
        $studentsToNotify[] = $data;
    }
}

logMessage("Total students with absences >= " . ABSENCE_THRESHOLD . ": $totalFound");
logMessage("Students to notify: " . count($studentsToNotify));

if (empty($studentsToNotify)) {
    logMessage("No students need notification.");
    mysqli_close($conn);
    exit(0);
}

// ─── Send emails ───
$sentCount = 0;
$failedCount = 0;
$testMode = false; // Set to true to test without sending

logMessage("Starting to send emails...");

foreach ($studentsToNotify as $student) {
    $email = $student['email'];
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = $student['nim'] . '@student.unsap.ac.id';
        logMessage("Using generated email: $email for {$student['student_name']}");
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        logMessage("❌ Invalid email for student {$student['student_name']} (NIM: {$student['nim']})", 'ERROR');
        $failedCount++;
        continue;
    }
    
    if ($testMode) {
        logMessage("TEST MODE: Would send to $email (Absences: {$student['absent_count']}/{$student['expected_sessions']})");
        $sentCount++;
        continue;
    }
    
    try {
        $result = sendEmail($email, $student, $smtpConfig);
        
        if ($result) {
            // Log success to attendance_notifications table
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
            if (mysqli_query($conn, $logQuery)) {
                $sentCount++;
                logMessage("✅ Sent notification to $email (Absences: {$student['absent_count']}/{$student['expected_sessions']})");
            } else {
                logMessage("⚠️ Email sent but failed to log: " . mysqli_error($conn), 'WARNING');
                $sentCount++;
            }
        } else {
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
            $failedCount++;
            logMessage("❌ Failed to send to $email", 'ERROR');
        }
    } catch (Exception $e) {
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
        $failedCount++;
        logMessage("❌ Error sending to $email: " . $e->getMessage(), 'ERROR');
    }
    
    usleep(200000); // Rate limiting
}

logMessage("=== COMPLETED ===");
logMessage("Sent: $sentCount, Failed: $failedCount, Total: " . count($studentsToNotify));

mysqli_close($conn);

// ────────────────────────────────────────
// EMAIL FUNCTION
// ────────────────────────────────────────

function sendEmail($email, $student, $smtpConfig) {
    try {
        $mail = new PHPMailer(true);
        
        $mail->isSMTP();
        $mail->Host = $smtpConfig['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $smtpConfig['username'];
        $mail->Password = $smtpConfig['password'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $smtpConfig['port'];
        $mail->SMTPDebug = 0;
        
        $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);
        $mail->addAddress($email, $student['student_name']);
        $mail->addReplyTo($smtpConfig['from_email'], $smtpConfig['from_name']);
        
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = "⚠️ Attendance Warning - Multiple Absences Detected";
        
        $body = generateEmailBody($student);
        $mail->Body = $body;
        $mail->AltBody = strip_tags($body);
        
        return $mail->send();
    } catch (Exception $e) {
        logMessage("PHPMailer error: " . $e->getMessage(), 'ERROR');
        return false;
    }
}

// ────────────────────────────────────────
// EMAIL BODY GENERATOR
// ────────────────────────────────────────

function generateEmailBody($student) {
    $absentCount = $student['absent_count'];
    $expected = $student['expected_sessions'];
    $percentage = $student['attendance_percentage'];
    $color = $percentage < 50 ? '#E74C3C' : ($percentage < 70 ? '#F39C12' : '#2ECC71');
    
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f6f9; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #2C3E50, #3498DB); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; color: white; background: {$color}; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498DB; }
            .info-item .label { font-size: 12px; color: #7F8C8D; text-transform: uppercase; }
            .info-item .value { font-size: 18px; font-weight: 600; color: #2C3E50; margin-top: 4px; }
            .warning-box { background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .warning-box strong { color: #856404; }
            .warning-box p { margin: 8px 0 0; color: #856404; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
            .footer p { margin: 0; color: #7F8C8D; font-size: 14px; }
            .attendance-bar { width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin-top: 8px; }
            .attendance-bar .fill { height: 100%; background: linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71); border-radius: 5px; width: {$percentage}%; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>📋 Attendance Warning</h1>
                <p>Multiple absence notification</p>
            </div>
            <div class='content'>
                <div class='status-badge'>⚠️ {$absentCount} Absence(s) Detected</div>
                <h2>Dear {$student['student_name']},</h2>
                <p style='color: #555; line-height: 1.6;'>
                    This is an automated notification regarding your attendance in the following course:
                </p>
                <div class='info-grid'>
                    <div class='info-item'>
                        <div class='label'>Course</div>
                        <div class='value'>{$student['class_code']} - {$student['class_name']}</div>
                    </div>
                    <div class='info-item'>
                        <div class='label'>Student</div>
                        <div class='value'>{$student['student_name']} ({$student['nim']})</div>
                    </div>
                    <div class='info-item'>
                        <div class='label'>Total Absences</div>
                        <div class='value' style='color: {$color};'>{$absentCount} of {$expected} sessions</div>
                    </div>
                    <div class='info-item'>
                        <div class='label'>Attendance Rate</div>
                        <div class='value'>{$percentage}%</div>
                        <div class='attendance-bar'>
                            <div class='fill'></div>
                        </div>
                    </div>
                </div>
                <div class='warning-box'>
                    <strong>⚠️ Important Notice</strong>
                    <p>
                        You have accumulated <strong>{$absentCount} absences</strong> out of <strong>{$expected}</strong> class sessions in this course.
                        The university requires minimum attendance of <strong>70%</strong> to be eligible for final examinations.
                        Your current attendance rate is <strong>{$percentage}%</strong>.
                    </p>
                </div>
                <h3>What to do next:</h3>
                <ul style='color: #555; line-height: 1.8;'>
                    <li>✅ Attend all future classes for this course</li>
                    <li>📅 Check the schedule regularly</li>
                    <li>📧 Contact your lecturer or academic advisor if you have concerns</li>
                </ul>
                <div style='text-align: center; margin: 20px 0;'>
                    <p style='font-size: 14px; color: #7F8C8D;'>
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </div>
            <div class='footer'>
                <p>&copy; " . date('Y') . " Attendance System UNSAP. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
}