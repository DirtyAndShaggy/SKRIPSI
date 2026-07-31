<?php
// ─── PHPMailer manual includes ───
require_once __DIR__ . '/vendor/phpmailer/PHPMailer-6.9.1/src/PHPMailer.php';
require_once __DIR__ . '/vendor/phpmailer/PHPMailer-6.9.1/src/SMTP.php';
require_once __DIR__ . '/vendor/phpmailer/PHPMailer-6.9.1/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// ─── CONFIGURE THESE ───
$smtpConfig = [
        // ─── SENDER (The dashboard email) ───
    'host' => 'smtp.gmail.com',
    'port' => 587,
    'username' => '220660121075@student.unsap.ac.id',      // DASHBOARD EMAIL
    'password' => 'epqp rmks khbj znwf',          // DASHBOARD  APP PASSWORD

    'from_email' => 'noreply@unsap.ac.id',
    'from_name' => 'Attendance System - UNSAP',
     // ─── RECIPIENT (Where test email goes) ───
    'to_email' => 'bornonlyforgaming@gmail.com',  // TEST RECIPIENT
    'to_name' => 'Test User'
];

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
    $mail->addAddress($smtpConfig['to_email'], $smtpConfig['to_name']);
    $mail->addReplyTo($smtpConfig['from_email'], $smtpConfig['from_name']);
    
    // Content
    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->Subject = '✅ Test Email - Attendance System UNSAP';
    $mail->Body = '
        <h1>✅ Test Email</h1>
        <p>PHPMailer is working correctly!</p>
        <p><strong>Sent at:</strong> ' . date('Y-m-d H:i:s') . '</p>
        <p><strong>From:</strong> Attendance System - UNSAP</p>
        <p><strong>Student email format:</strong> nim@student.unsap.ac.id</p>
    ';
    $mail->AltBody = 'PHPMailer is working correctly!';
    
    if ($mail->send()) {
        echo "✅ Test email sent successfully to {$smtpConfig['to_email']}";
    } else {
        echo "❌ Failed to send: " . $mail->ErrorInfo;
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>