<?php
/**
 * Export Attendance to Excel
 * Supports: schedule, groups, semester, cohort exports
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once __DIR__ . '/../config/database.php';

date_default_timezone_set('Asia/Jakarta');

// ─── GET PARAMETERS ───
$user_id = $_GET['user_id'] ?? 0;
$role = $_GET['role'] ?? 'lecturer';
$export_type = $_GET['export_type'] ?? 'schedule';
$schedule_id = $_GET['schedule_id'] ?? null;
$class_id = $_GET['class_id'] ?? null;
$cohort_id = $_GET['cohort_id'] ?? null;
$group_id = $_GET['group_id'] ?? null;
$group_ids = $_GET['group_ids'] ?? null; // comma-separated
$semester = $_GET['semester'] ?? null;
$date_from = $_GET['date_from'] ?? date('Y-m-d');
$date_to = $_GET['date_to'] ?? date('Y-m-d');
$preview = isset($_GET['preview']) && $_GET['preview'] === 'true';

// ─── VALIDATE ───
if (!in_array($export_type, ['schedule', 'groups', 'semester', 'cohort'])) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'error', 'message' => 'Invalid export type']);
    exit;
}

// ─── GET LECTURER ID (if lecturer role) ───
$lecturer_id = null;
if ($role === 'lecturer' && $user_id) {
    $lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
    $lecturerResult = mysqli_query($conn, $lecturerQuery);
    if ($lecturerRow = mysqli_fetch_assoc($lecturerResult)) {
        $lecturer_id = $lecturerRow['lecturer_id'];
    }
}

// ─── FETCH DATA ───
$data = fetchAttendanceData($conn, $export_type, $schedule_id, $class_id, $cohort_id, $group_id, $group_ids, $semester, $date_from, $date_to, $lecturer_id, $role);

if (isset($data['error'])) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'error', 'message' => $data['error']]);
    exit;
}

// ─── IF PREVIEW MODE, RETURN JSON ───
if ($preview) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'success', 'data' => $data]);
    exit;
}

// ─── CHECK IF PHPSPREADSHEET IS INSTALLED ───
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    exportCSV($conn, $data);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

// ─── GENERATE EXCEL ───
try {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Attendance');
    
    $row = 1;
    
    // ─── TITLE ───
    $sheet->mergeCells("A$row:I$row");
    $sheet->setCellValue("A$row", "ATTENDANCE REPORT");
    $sheet->getStyle("A$row")->getFont()->setBold(true)->setSize(16);
    $sheet->getStyle("A$row")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $row += 2;
    
    // ─── INFO SECTION ───
    $info = [
        ['Export Type', ucfirst($export_type)],
        ['Generated', date('Y-m-d H:i:s')],
        ['Date Range', "$date_from to $date_to"]
    ];
    
    if ($export_type === 'schedule' && isset($data['schedule'])) {
        $info[] = ['Class', $data['schedule']['class_name'] ?? 'N/A'];
        $info[] = ['Class Code', $data['schedule']['class_code'] ?? 'N/A'];
        $info[] = ['Schedule', ($data['schedule']['day_of_week'] ?? '') . ' ' . ($data['schedule']['start_time'] ?? '') . ' - ' . ($data['schedule']['end_time'] ?? '')];
        $info[] = ['Group', $data['schedule']['group_name'] ?? 'N/A'];
    } elseif (($export_type === 'groups') && isset($data['groups_info'])) {
        $info[] = ['Groups', implode(', ', array_column($data['groups_info'], 'group_name'))];
        $info[] = ['Total Groups', count($data['groups_info'])];
    } elseif ($export_type === 'semester' && isset($data['class'])) {
        $info[] = ['Class', ($data['class']['class_name'] ?? '') . ' (' . ($data['class']['class_code'] ?? '') . ')'];
        $info[] = ['Lecturer', $data['class']['lecturer_name'] ?? 'N/A'];
        $info[] = ['Semester', $semester];
        $info[] = ['Total Schedules', count($data['schedules'] ?? [])];
        $info[] = ['Total Students', count($data['students'] ?? [])];
    } elseif ($export_type === 'cohort' && isset($data['cohort'])) {
        $info[] = ['Cohort', $data['cohort']['cohort_name'] ?? 'N/A'];
        $info[] = ['Total Students', count($data['students'] ?? [])];
    }
    
    foreach ($info as $item) {
        $sheet->setCellValue("A$row", $item[0] . ':');
        $sheet->setCellValue("B$row", $item[1]);
        $sheet->getStyle("A$row")->getFont()->setBold(true);
        $row++;
    }
    $row += 2;
    
    // ─── DETERMINE HEADERS ───
    if ($export_type === 'semester') {
        $headers = ['#', 'NIM', 'Student Name', 'Semester', 'Group', 'Total Schedules', 'Present', 'Late', 'Absent', 'Attendance Rate'];
    } elseif ($export_type === 'groups') {
        $headers = ['#', 'NIM', 'Student Name', 'Semester', 'Group', 'Status', 'Date', 'Time', 'Device'];
    } else {
        $headers = ['#', 'NIM', 'Student Name', 'Semester', 'Group', 'Status', 'Date', 'Time', 'Device'];
    }
    
    // ─── APPLY HEADERS ───
    $headerStyle = [
        'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2C3E50']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
    ];
    
    foreach ($headers as $col => $header) {
        $cell = chr(65 + $col) . $row;
        $sheet->setCellValue($cell, $header);
        $sheet->getStyle($cell)->applyFromArray($headerStyle);
        $sheet->getColumnDimension(chr(65 + $col))->setAutoSize(true);
    }
    $row++;
    
    // ─── STYLES ───
    $presentStyle = [
        'font' => ['color' => ['argb' => 'FF27AE60'], 'bold' => true],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFD5F5E3']]
    ];
    
    $lateStyle = [
        'font' => ['color' => ['argb' => 'FFF39C12'], 'bold' => true],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFDEBD0']]
    ];
    
    $absentStyle = [
        'font' => ['color' => ['argb' => 'FFE74C3C'], 'bold' => true],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFADBD8']]
    ];
    
    $cellStyle = [
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
    ];
    
    // ─── DATA ───
    $students = $data['students'] ?? [];
    $index = 1;
    
    foreach ($students as $student) {
        $col = 0;
        $sheet->setCellValue(chr(65 + $col++) . $row, $index);
        $sheet->setCellValue(chr(65 + $col++) . $row, $student['nim'] ?? '');
        $sheet->setCellValue(chr(65 + $col++) . $row, $student['student_name'] ?? '');
        $sheet->setCellValue(chr(65 + $col++) . $row, $student['student_semester'] ?? '');
        $sheet->setCellValue(chr(65 + $col++) . $row, $student['group_name'] ?? $student['group_code'] ?? '');
        
        if ($export_type === 'semester') {
            // ── Semester Summary ──
            $attRecords = $student['attendance_records'] ?? [];
            $totalSchedules = count($data['schedules'] ?? []);
            $present = count(array_filter($attRecords, function($a) { return ($a['status'] ?? '') === 'Present'; }));
            $late = count(array_filter($attRecords, function($a) { return ($a['status'] ?? '') === 'Late'; }));
            $absent = $totalSchedules - count($attRecords);
            $rate = $totalSchedules > 0 ? round(($present + $late) / $totalSchedules * 100, 1) : 0;
            
            $sheet->setCellValue(chr(65 + $col++) . $row, $totalSchedules);
            $sheet->setCellValue(chr(65 + $col++) . $row, $present);
            $sheet->setCellValue(chr(65 + $col++) . $row, $late);
            $sheet->setCellValue(chr(65 + $col++) . $row, $absent);
            
            $rateCell = chr(65 + $col++) . $row;
            $sheet->setCellValue($rateCell, $rate . '%');
            
            if ($rate >= 70) {
                $sheet->getStyle($rateCell)->applyFromArray($presentStyle);
            } elseif ($rate >= 40) {
                $sheet->getStyle($rateCell)->applyFromArray($lateStyle);
            } else {
                $sheet->getStyle($rateCell)->applyFromArray($absentStyle);
            }
        } else {
            // ── Regular Attendance ──
            $status = $student['final_status'] ?? $student['status'] ?? 'Absent';
            $statusCell = chr(65 + $col++) . $row;
            $sheet->setCellValue($statusCell, $status);
            
            if ($status === 'Present') {
                $sheet->getStyle($statusCell)->applyFromArray($presentStyle);
            } elseif ($status === 'Late') {
                $sheet->getStyle($statusCell)->applyFromArray($lateStyle);
            } else {
                $sheet->getStyle($statusCell)->applyFromArray($absentStyle);
            }
            
            $sheet->setCellValue(chr(65 + $col++) . $row, $student['attendance_date'] ?? '');
            $sheet->setCellValue(chr(65 + $col++) . $row, $student['attendance_time'] ? date('H:i:s', strtotime($student['attendance_time'])) : '-');
            $sheet->setCellValue(chr(65 + $col++) . $row, $student['device_id'] ?? '-');
        }
        
        // Apply cell style
        for ($c = 0; $c < count($headers); $c++) {
            $cell = chr(65 + $c) . $row;
            $sheet->getStyle($cell)->applyFromArray($cellStyle);
        }
        
        $row++;
        $index++;
    }
    
    // ─── OUTPUT ───
    $filename = "attendance_{$export_type}_" . date('Y-m-d_H-i-s') . ".xlsx";
    
    if (ob_get_length()) ob_end_clean();
    
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: max-age=0');
    header('Pragma: public');
    
    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
    
} catch (Exception $e) {
    header("Content-Type: application/json");
    echo json_encode(['status' => 'error', 'message' => 'Excel generation failed: ' . $e->getMessage()]);
    exit;
}

// ────────────────────────────────────────
// CSV FALLBACK
// ────────────────────────────────────────

function exportCSV($conn, $data) {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="attendance_export.csv"');
    
    $output = fopen('php://output', 'w');
    fputcsv($output, ['NIM', 'Name', 'Email', 'Semester', 'Group', 'Status', 'Date', 'Time']);
    
    $students = $data['students'] ?? [];
    foreach ($students as $student) {
        fputcsv($output, [
            $student['nim'] ?? '',
            $student['student_name'] ?? '',
            $student['email'] ?? '',
            $student['student_semester'] ?? '',
            $student['group_name'] ?? '',
            $student['final_status'] ?? $student['status'] ?? 'Absent',
            $student['attendance_date'] ?? '',
            $student['attendance_time'] ?? ''
        ]);
    }
    fclose($output);
    exit;
}

// ────────────────────────────────────────
// DATA FETCHING FUNCTION
// ────────────────────────────────────────

function fetchAttendanceData($conn, $export_type, $schedule_id, $class_id, $cohort_id, $group_id, $group_ids, $semester, $date_from, $date_to, $lecturer_id, $role) {
    $data = [];
    $data['students'] = [];
    
    // ─── BUILD GROUP IDS ARRAY ───
    $groupIdsArray = [];
    if ($group_ids) {
        $groupIdsArray = array_map('trim', explode(',', $group_ids));
    } elseif ($group_id) {
        $groupIdsArray = [$group_id];
    }
    
    switch ($export_type) {
        case 'schedule':
            if (!$schedule_id) {
                return ['error' => 'schedule_id required for schedule export'];
            }
            
            // Get schedule info
            $query = "
                SELECT 
                    cs.schedule_id,
                    cs.class_id,
                    cs.day_of_week,
                    cs.start_time,
                    cs.end_time,
                    cs.grace_period,
                    c.class_name,
                    c.class_code,
                    g.group_name,
                    g.group_code
                FROM class_schedules cs
                JOIN classes c ON cs.class_id = c.class_id
                LEFT JOIN `groups` g ON cs.group_id = g.group_id
                WHERE cs.schedule_id = '$schedule_id'
            ";
            $result = mysqli_query($conn, $query);
            if ($result && $row = mysqli_fetch_assoc($result)) {
                $data['schedule'] = $row;
            } else {
                return ['error' => 'Schedule not found'];
            }
            
            // Get students and attendance
            $query = "
                SELECT 
                    s.student_id,
                    s.nim,
                    s.name AS student_name,
                    s.semester AS student_semester,
                    g.group_name,
                    g.group_code,
                    DATE(a.timestamp) AS attendance_date,
                    a.status,
                    TIME(a.timestamp) AS attendance_time,
                    a.device_id,
                    CASE 
                        WHEN a.status IS NOT NULL THEN a.status
                        ELSE 'Absent'
                    END AS final_status
                FROM students s
                LEFT JOIN schedule_students ss ON s.student_id = ss.student_id
                LEFT JOIN `groups` g ON s.group_id = g.group_id
                LEFT JOIN attendance a ON s.student_id = a.student_id 
                    AND a.schedule_id = '$schedule_id'
                    AND DATE(a.timestamp) BETWEEN '$date_from' AND '$date_to'
                WHERE ss.schedule_id = '$schedule_id'
                ORDER BY s.name ASC
            ";
            $result = mysqli_query($conn, $query);
            while ($row = mysqli_fetch_assoc($result)) {
                $data['students'][] = $row;
            }
            break;
            
        case 'groups':
            if (empty($groupIdsArray)) {
                return ['error' => 'group_id or group_ids required for groups export'];
            }
            
            // Get group info
            $groupIdsList = implode(',', $groupIdsArray);
            $query = "SELECT group_id, group_name, group_code FROM `groups` WHERE group_id IN ($groupIdsList)";
            $result = mysqli_query($conn, $query);
            $groupsInfo = [];
            while ($row = mysqli_fetch_assoc($result)) {
                $groupsInfo[] = $row;
            }
            $data['groups_info'] = $groupsInfo;
            
            // Get students and attendance for all groups
            $query = "
                SELECT 
                    s.student_id,
                    s.nim,
                    s.name AS student_name,
                    s.semester AS student_semester,
                    g.group_name,
                    g.group_code,
                    DATE(a.timestamp) AS attendance_date,
                    a.status,
                    TIME(a.timestamp) AS attendance_time,
                    a.device_id,
                    CASE 
                        WHEN a.status IS NOT NULL THEN a.status
                        ELSE 'Absent'
                    END AS final_status
                FROM students s
                JOIN `groups` g ON s.group_id = g.group_id
                LEFT JOIN attendance a ON s.student_id = a.student_id 
                    AND DATE(a.timestamp) BETWEEN '$date_from' AND '$date_to'
                WHERE s.group_id IN ($groupIdsList)
                ORDER BY s.name ASC
            ";
            $result = mysqli_query($conn, $query);
            while ($row = mysqli_fetch_assoc($result)) {
                $data['students'][] = $row;
            }
            break;
            
        case 'semester':
            if (empty($groupIdsArray) || !$semester) {
                return ['error' => 'group_id and semester required for semester export'];
            }
            $group_id = $groupIdsArray[0];

            // Get group info
            $groupQuery = "SELECT group_id, group_name, group_code, cohort_id FROM `groups` WHERE group_id = '$group_id'";
            $groupResult = mysqli_query($conn, $groupQuery);
            if ($groupResult && $row = mysqli_fetch_assoc($groupResult)) {
                $data['group'] = $row;
            } else {
                return ['error' => 'Group not found'];
            }
            
            // Get cohort info (optional)
            if (isset($data['group']['cohort_id'])) {
                $cohortQuery = "SELECT cohort_id, cohort_name FROM cohorts WHERE cohort_id = '{$data['group']['cohort_id']}'";
                $cohortResult = mysqli_query($conn, $cohortQuery);
                if ($cohortResult && $row = mysqli_fetch_assoc($cohortResult)) {
                    $data['cohort'] = $row;
                }
            }
            
            // Find all schedules for this group in the given semester
            $scheduleQuery = "
                SELECT cs.schedule_id, cs.class_id, cs.day_of_week, cs.start_time, cs.end_time,
                       c.class_code, c.class_name
                FROM class_schedules cs
                JOIN classes c ON cs.class_id = c.class_id
                WHERE cs.group_id = '$group_id' AND cs.semester = '$semester'
                ORDER BY cs.day_of_week, cs.start_time
            ";
            $scheduleResult = mysqli_query($conn, $scheduleQuery);
            $schedules = [];
            $scheduleIds = [];
            while ($row = mysqli_fetch_assoc($scheduleResult)) {
                $schedules[] = $row;
                $scheduleIds[] = $row['schedule_id'];
            }
            $data['schedules'] = $schedules;
            
            if (empty($scheduleIds)) {
                return ['error' => 'No schedules found for this group and semester'];
            }
            $scheduleIdList = implode(',', $scheduleIds);
            
            // Get all students in this group
            $studentQuery = "
                SELECT 
                    s.student_id,
                    s.nim,
                    s.name AS student_name,
                    s.semester AS student_semester,
                    g.group_name,
                    g.group_code
                FROM students s
                JOIN `groups` g ON s.group_id = g.group_id
                WHERE s.group_id = '$group_id'
                ORDER BY s.name ASC
            ";
            $studentResult = mysqli_query($conn, $studentQuery);
            
            while ($studentRow = mysqli_fetch_assoc($studentResult)) {
                $student_id = $studentRow['student_id'];
                
                // Get attendance records for this student across all schedules in this semester
                $attQuery = "
                    SELECT 
                        DATE(timestamp) AS attendance_date,
                        status,
                        TIME(timestamp) AS attendance_time
                    FROM attendance
                    WHERE student_id = '$student_id' 
                    AND schedule_id IN ($scheduleIdList)
                ";
                $attResult = mysqli_query($conn, $attQuery);
                $attendance_records = [];
                while ($attRow = mysqli_fetch_assoc($attResult)) {
                    $attendance_records[] = $attRow;
                }
                
                $studentRow['attendance_records'] = $attendance_records;
                $data['students'][] = $studentRow;
            }
            break;

            // Check permission for lecturer
            if ($role === 'lecturer' && $lecturer_id) {
                $checkQuery = "SELECT class_id FROM classes WHERE class_id = '$class_id' AND lecturer_id = '$lecturer_id'";
                $checkResult = mysqli_query($conn, $checkQuery);
                if (!$checkResult || mysqli_num_rows($checkResult) === 0) {
                    return ['error' => 'You do not have permission to export this class'];
                }
            }
            
            // Get class info
            $query = "
                SELECT 
                    c.class_id,
                    c.class_code,
                    c.class_name,
                    l.full_name AS lecturer_name
                FROM classes c
                LEFT JOIN lecturers l ON c.lecturer_id = l.lecturer_id
                WHERE c.class_id = '$class_id'
            ";
            $result = mysqli_query($conn, $query);
            if ($result && $row = mysqli_fetch_assoc($result)) {
                $data['class'] = $row;
            } else {
                return ['error' => 'Class not found'];
            }
            
            // Get schedules for this semester
            $query = "
                SELECT schedule_id, day_of_week, start_time, end_time
                FROM class_schedules
                WHERE class_id = '$class_id' AND semester = '$semester'
                ORDER BY day_of_week, start_time
            ";
            $result = mysqli_query($conn, $query);
            $schedules = [];
            $scheduleIds = [];
            while ($row = mysqli_fetch_assoc($result)) {
                $schedules[] = $row;
                $scheduleIds[] = $row['schedule_id'];
            }
            $data['schedules'] = $schedules;
            
            if (empty($scheduleIds)) {
                return ['error' => 'No schedules found for this class and semester'];
            }
            $scheduleIdList = implode(',', $scheduleIds);
            
            // Get students with attendance summary
            $query = "
                SELECT DISTINCT
                    s.student_id,
                    s.nim,
                    s.name AS student_name,
                    s.semester AS student_semester,
                    g.group_name,
                    g.group_code
                FROM students s
                LEFT JOIN `groups` g ON s.group_id = g.group_id
                LEFT JOIN schedule_students ss ON s.student_id = ss.student_id
                LEFT JOIN class_schedules cs ON ss.schedule_id = cs.schedule_id
                WHERE cs.class_id = '$class_id' AND cs.semester = '$semester'
                ORDER BY s.name ASC
            ";
            $result = mysqli_query($conn, $query);
            while ($row = mysqli_fetch_assoc($result)) {
                $student_id = $row['student_id'];
                
                // Get attendance records
                $attQuery = "
                    SELECT 
                        DATE(timestamp) AS attendance_date,
                        status,
                        TIME(timestamp) AS attendance_time
                    FROM attendance
                    WHERE student_id = '$student_id' 
                    AND schedule_id IN ($scheduleIdList)
                ";
                $attResult = mysqli_query($conn, $attQuery);
                $attendance_records = [];
                while ($attRow = mysqli_fetch_assoc($attResult)) {
                    $attendance_records[] = $attRow;
                }
                
                $row['attendance_records'] = $attendance_records;
                $data['students'][] = $row;
            }
            break;
            
        case 'cohort':
            if (!$cohort_id) {
                return ['error' => 'cohort_id required for cohort export'];
            }
            
            // Get cohort info
            $query = "SELECT cohort_id, cohort_name FROM cohorts WHERE cohort_id = '$cohort_id'";
            $result = mysqli_query($conn, $query);
            if ($result && $row = mysqli_fetch_assoc($result)) {
                $data['cohort'] = $row;
            } else {
                return ['error' => 'Cohort not found'];
            }
            
            // Get students with attendance
            $query = "
                SELECT 
                    s.student_id,
                    s.nim,
                    s.name AS student_name,
                    s.semester AS student_semester,
                    g.group_name,
                    g.group_code,
                    c.class_name,
                    DATE(a.timestamp) AS attendance_date,
                    a.status,
                    TIME(a.timestamp) AS attendance_time,
                    a.device_id,
                    CASE 
                        WHEN a.status IS NOT NULL THEN a.status
                        ELSE 'Absent'
                    END AS final_status
                FROM students s
                LEFT JOIN `groups` g ON s.group_id = g.group_id
                LEFT JOIN schedule_students ss ON s.student_id = ss.student_id
                LEFT JOIN class_schedules cs ON ss.schedule_id = cs.schedule_id
                LEFT JOIN classes c ON cs.class_id = c.class_id
                LEFT JOIN attendance a ON s.student_id = a.student_id 
                    AND a.schedule_id = cs.schedule_id
                    AND DATE(a.timestamp) BETWEEN '$date_from' AND '$date_to'
                WHERE s.cohort_id = '$cohort_id'
                ORDER BY s.name ASC
            ";
            $result = mysqli_query($conn, $query);
            while ($row = mysqli_fetch_assoc($result)) {
                $data['students'][] = $row;
            }
            break;
    }
    
    return $data;
}
?>