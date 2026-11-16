<?php
session_start();
header("Content-Type: application/json");

require_once "config.php";

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Please login first."
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$currentPassword = $data['current_password'] ?? '';
$newPassword = $data['new_password'] ?? '';
$confirmPassword = $data['confirm_password'] ?? '';

if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
    echo json_encode([
        "success" => false,
        "message" => "All fields are required."
    ]);
    exit;
}

if (strlen($newPassword) < 8) {
    echo json_encode([
        "success" => false,
        "message" => "New password must be at least 8 characters."
    ]);
    exit;
}

if ($newPassword !== $confirmPassword) {
    echo json_encode([
        "success" => false,
        "message" => "New passwords do not match."
    ]);
    exit;
}

if ($currentPassword === $newPassword) {
    echo json_encode([
        "success" => false,
        "message" => "New password must be different."
    ]);
    exit;
}

$uniqueId = $_SESSION['unique_id'];

$stmt = mysqli_prepare(
    $conn,
    "SELECT password FROM users WHERE unique_id = ? LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "s", $uniqueId);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$user || !hash_equals($user['password'], md5($currentPassword))) {
    echo json_encode([
        "success" => false,
        "message" => "Current password is incorrect."
    ]);
    exit;
}

$newPasswordHash = md5($newPassword);

$stmt = mysqli_prepare(
    $conn,
    "UPDATE users SET password = ? WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "ss", $newPasswordHash, $uniqueId);

if (mysqli_stmt_execute($stmt) && mysqli_stmt_affected_rows($stmt) >= 0) {
    echo json_encode([
        "success" => true,
        "message" => "Password changed successfully."
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to update password."
    ]);
}

mysqli_stmt_close($stmt);
?>