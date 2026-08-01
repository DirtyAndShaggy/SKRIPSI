<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");

require_once __DIR__ . '/../config/database.php';

// ─── PHPMailer manual includes ───
$phpmailerPath = __DIR__ . '/../vendor/phpmailer/PHPMailer-6.9.1/src/';

require_once $phpmailerPath . 'PHPMailer.php';
require_once $phpmailerPath . 'SMTP.php';
require_once $phpmailerPath . 'Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$data = json_decode(file_get_contents("php://input"), true);
$studentIds = $data['student_ids'] ?? [];
$threshold = $data['threshold'] ?? 3;

if (empty($studentIds)) {
    echo json_encode(['status' => 'error', 'message' => 'No students selected']);
    exit;
}

// ─── Get student details ───
$idList = implode(',', array_map('intval', $studentIds));
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

// ─── Email Configuration ───
// !!! UPDATE THESE WITH YOUR ACTUAL SMTP SETTINGS !!!
$smtpConfig = [
    'host' => 'smtp.gmail.com',
    'port' => 587,
    'username' => 'your-email@gmail.com',
    'password' => 'your-app-password',
    'from_email' => 'noreply@unsap.ac.id',
    'from_name' => 'Attendance System - UNSAP'
];

// ─── Send emails ───
$sentCount = 0;
$failedStudents = [];

foreach ($students as $student) {
    // Generate university email if not set
    $email = $student['email'];
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = $student['nim'] . '@student.unsap.ac.id';
    }
    
    // FOR TESTING: Force send to your email (remove this line when done testing)
    // $email = 'your-email@gmail.com';
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $failedStudents[] = ['student_id' => $student['student_id'], 'email' => $email, 'reason' => 'Invalid email'];
        continue;
    }
    
    try {
        $mail = new PHPMailer(true);
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = $smtpConfig['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $smtpConfig['username'];
        $mail->Password = $smtpConfig['password'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $smtpConfig['port'];
        
        // Sender
        $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);
        $mail->addAddress($email, $student['student_name']);
        $mail->addReplyTo($smtpConfig['from_email'], $smtpConfig['from_name']);
        
        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = "⚠️ Attendance Warning - Repetitive Absences Detected";
        
        // ─── Email Body ───
        $body = generateEmailBody($student);
        $mail->Body = $body;
        $mail->AltBody = strip_tags($body);
        
        if ($mail->send()) {
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
    
    // Rate limiting: pause between emails
    usleep(100000); // 0.1 second
}

echo json_encode([
    'status' => 'success',
    'sent' => $sentCount,
    'failed' => count($failedStudents),
    'total' => count($students),
    'failed_students' => $failedStudents
]);

mysqli_close($conn);

// ─── Generate Email Body ───
function generateEmailBody($student) {
    $absentCount = $student['absent_count'];
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
            .attendance-bar .fill { height: 100%; background: linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71); border-radius: 5px; transition: width 0.5s; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>📋 Attendance Warning</h1>
                <p>Repetitive absence notification</p>
            </div>
            <div class='content'>
                <div class='status-badge'>⚠️ {$absentCount} Absences Detected</div>
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
                        <div class='value' style='color: {$color};'>{$absentCount}</div>
                    </div>
                    <div class='info-item'>
                        <div class='label'>Attendance Rate</div>
                        <div class='value'>{$percentage}%</div>
                        <div class='attendance-bar'>
                            <div class='fill' style='width: {$percentage}%;'></div>
                        </div>
                    </div>
                </div>
                
                <div class='warning-box'>
                    <strong>⚠️ Important Notice</strong>
                    <p>
                        You have accumulated <strong>{$absentCount} absences</strong> in this course.
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
?>