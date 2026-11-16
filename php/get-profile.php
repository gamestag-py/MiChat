
<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Not authenticated"]);
    exit;
}

$current_id = (int) $_SESSION['unique_id'];
$target_id = isset($_GET['user_id'])
    ? (int) $_GET['user_id']
    : $current_id;

$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id, fname, lname, img, bio, status
     FROM users WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "i", $target_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($result);

if (!$user) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "User not found"]);
    exit;
}

echo json_encode([
    "success" => true,
    "profile" => [
        "unique_id" => $user['unique_id'],
        "name" => $user['fname'] . " " . $user['lname'],
        "fname" => $user['fname'],
        "lname" => $user['lname'],
        "img" => $user['img'],
        "bio" => $user['bio'] ?? "",
        "status" => $user['status'],
        "is_me" => ((string)$current_id === (string)$target_id)
    ]
]);

mysqli_stmt_close($stmt);
?>
