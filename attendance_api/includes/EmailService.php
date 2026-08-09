<?php
/**
 * Email Service for Attendance System
 */

require_once __DIR__ . '/../vendor/phpmailer/PHPMailer-6.9.1/src/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer-6.9.1/src/SMTP.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer-6.9.1/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class EmailService {
    private $conn;
    private $mail;
    private $config;
    
    public function __construct($conn) {
        $this->conn = $conn;
        $this->loadConfig();
        $this->initMailer();
    }
    
    private function loadConfig() {
        // UPDATE THESE WITH YOUR ACTUAL SMTP SETTINGS
        $this->config = [
            'smtp_host' => 'smtp.gmail.com',
            'smtp_port' => 587,
            'smtp_username' => getenv('SMTP_USERNAME') ?: '220660121075@student.unsap.ac.id',
            'smtp_password' => getenv('SMTP_PASSWORD') ?: 'epqp rmks khbj znwf',
            'from_email' => 'noreply@unsap.ac.id',
            'from_name' => 'Attendance System - UNSAP'
        ];
    }
    
    private function initMailer() {
        try {
            $this->mail = new PHPMailer(true);
            $this->mail->isSMTP();
            $this->mail->Host = $this->config['smtp_host'];
            $this->mail->SMTPAuth = true;
            $this->mail->Username = $this->config['smtp_username'];
            $this->mail->Password = $this->config['smtp_password'];
            $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mail->Port = $this->config['smtp_port'];
            $this->mail->setFrom($this->config['from_email'], $this->config['from_name']);
            $this->mail->isHTML(true);
            $this->mail->CharSet = 'UTF-8';
            $this->mail->SMTPDebug = 0; // Set to 2 for debugging
        } catch (Exception $e) {
            error_log("EmailService init error: " . $e->getMessage());
        }
    }
    
    public function sendAbsenceNotification($student_id, $student_name, $email, $nim, $class_name, $class_code, $absence_count, $attendance_percentage, $lecturer_name = null) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($email, $student_name);
            $this->mail->addReplyTo($this->config['from_email'], $this->config['from_name']);
            
            $this->mail->Subject = "⚠️ Attendance Warning - Repetitive Absences Detected";
            $this->mail->Body = $this->generateEmailBody($student_name, $nim, $class_name, $class_code, $absence_count, $attendance_percentage, $lecturer_name);
            $this->mail->AltBody = strip_tags($this->mail->Body);
            
            return $this->mail->send();
        } catch (Exception $e) {
            error_log("Email failed for $email: " . $e->getMessage());
            return false;
        }
    }
    
    private function generateEmailBody($student_name, $nim, $class_name, $class_code, $absence_count, $attendance_percentage, $lecturer_name) {
        $color = $attendance_percentage < 50 ? '#E74C3C' : ($attendance_percentage < 70 ? '#F39C12' : '#2ECC71');
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f6f9; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #2C3E50, #3498DB); padding: 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .header p { color: rgba(255,255,255,0.8); }
                .content { padding: 30px; }
                .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; color: white; background: {$color}; margin-bottom: 20px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498DB; }
                .info-item .label { font-size: 12px; color: #7F8C8D; }
                .info-item .value { font-size: 18px; font-weight: 600; color: #2C3E50; margin-top: 4px; }
                .warning-box { background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 15px; margin: 20px 0; }
                .warning-box strong { color: #856404; }
                .warning-box p { margin: 8px 0 0; color: #856404; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
                .footer p { margin: 0; color: #7F8C8D; font-size: 14px; }
                .attendance-bar { width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden; margin-top: 8px; }
                .attendance-bar .fill { height: 100%; background: linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71); border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>📋 Attendance Warning</h1>
                    <p>Repetitive absence notification</p>
                </div>
                <div class='content'>
                    <div class='status-badge'>⚠️ {$absence_count} Absences Detected</div>
                    <h2>Dear {$student_name},</h2>
                    <p style='color: #555; line-height: 1.6;'>
                        This is an automated notification regarding your attendance.
                    </p>
                    <div class='info-grid'>
                        <div class='info-item'>
                            <div class='label'>Course</div>
                            <div class='value'>{$class_code} - {$class_name}</div>
                        </div>
                        <div class='info-item'>
                            <div class='label'>Student</div>
                            <div class='value'>{$student_name} ({$nim})</div>
                        </div>
                        <div class='info-item'>
                            <div class='label'>Total Absences</div>
                            <div class='value' style='color: {$color};'>{$absence_count}</div>
                        </div>
                        <div class='info-item'>
                            <div class='label'>Attendance Rate</div>
                            <div class='value'>{$attendance_percentage}%</div>
                            <div class='attendance-bar'>
                                <div class='fill' style='width: {$attendance_percentage}%;'></div>
                            </div>
                        </div>
                    </div>
                    <div class='warning-box'>
                        <strong>⚠️ Important Notice</strong>
                        <p>
                            You have accumulated <strong>{$absence_count} absences</strong> in this course.
                            The university requires minimum attendance of <strong>70%</strong>.
                            Your current rate is <strong>{$attendance_percentage}%</strong>.
                        </p>
                    </div>
                    <h3>What to do next:</h3>
                    <ul style='color: #555; line-height: 1.8;'>
                        <li>✅ Attend all future classes</li>
                        <li>📅 Check the schedule regularly</li>
                        <li>📧 Contact your lecturer or academic advisor if you have concerns</li>
                    </ul>
                    <div style='text-align: center; margin: 20px 0;'>
                        <p style='font-size: 14px; color: #7F8C8D;'>
                            This is an automated notification. Please do not reply.
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
}
?>