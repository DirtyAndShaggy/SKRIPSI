<?php
echo "=== Password Hashes ===<br><br>";

$passwords = [
    'admin123' => 'admin@test.com',
    'lecturer123' => 'lecturer@test.com',
    'password123' => 'test@test.com'
];

foreach ($passwords as $password => $email) {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    echo "Email: $email<br>";
    echo "Password: $password<br>";
    echo "Hash: $hash<br><br>";
    
    // Verify it works
    if (password_verify($password, $hash)) {
        echo "✅ Verification PASSED<br><br>";
    } else {
        echo "❌ Verification FAILED<br><br>";
    }
}
?>