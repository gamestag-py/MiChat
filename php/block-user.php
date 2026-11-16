<<<<<<< HEAD

<?php
session_start();
require_once "config.php";

header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$current_id = (int) $_SESSION['unique_id'];

$input = json_decode(file_get_contents("php://input"), true);

$user_id = filter_var(
    $input['user_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$user_id || $user_id <= 0 || $user_id === $current_id) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid user"
    ]);
    exit;
}

// Check whether target user exists.
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);

$target = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$target) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
    exit;
}

// Check existing block relationship.
$stmt = mysqli_prepare(
    $conn,
    "SELECT 1 FROM user_blocks
     WHERE blocker_id = ? AND blocked_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "ii", $current_id, $user_id);
mysqli_stmt_execute($stmt);

$is_blocked = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if ($is_blocked) {

    // Already blocked: unblock user.
    $stmt = mysqli_prepare(
        $conn,
        "DELETE FROM user_blocks
         WHERE blocker_id = ? AND blocked_id = ?"
    );

    mysqli_stmt_bind_param($stmt, "ii", $current_id, $user_id);

    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    if (!$success) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to unblock user"
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "action" => "unblocked",
        "blocked" => false,
        "message" => "User unblocked successfully"
    ]);

} else {

    // Not blocked: block user.
    $stmt = mysqli_prepare(
        $conn,
        "INSERT INTO user_blocks (blocker_id, blocked_id)
         VALUES (?, ?)"
    );

    mysqli_stmt_bind_param($stmt, "ii", $current_id, $user_id);

    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    if (!$success) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to block user"
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "action" => "blocked",
        "blocked" => true,
        "message" => "User blocked successfully"
    ]);
}
=======

<?php
session_start();
require_once "config.php";

header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$current_id = (int) $_SESSION['unique_id'];

$input = json_decode(file_get_contents("php://input"), true);

$user_id = filter_var(
    $input['user_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$user_id || $user_id <= 0 || $user_id === $current_id) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid user"
    ]);
    exit;
}

// Check whether target user exists.
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);

$target = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$target) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
    exit;
}

// Check existing block relationship.
$stmt = mysqli_prepare(
    $conn,
    "SELECT 1 FROM user_blocks
     WHERE blocker_id = ? AND blocked_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "ii", $current_id, $user_id);
mysqli_stmt_execute($stmt);

$is_blocked = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if ($is_blocked) {

    // Already blocked: unblock user.
    $stmt = mysqli_prepare(
        $conn,
        "DELETE FROM user_blocks
         WHERE blocker_id = ? AND blocked_id = ?"
    );

    mysqli_stmt_bind_param($stmt, "ii", $current_id, $user_id);

    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    if (!$success) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to unblock user"
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "action" => "unblocked",
        "blocked" => false,
        "message" => "User unblocked successfully"
    ]);

} else {

    // Not blocked: block user.
    $stmt = mysqli_prepare(
        $conn,
        "INSERT INTO user_blocks (blocker_id, blocked_id)
         VALUES (?, ?)"
    );

    mysqli_stmt_bind_param($stmt, "ii", $current_id, $user_id);

    $success = mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    if (!$success) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to block user"
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "action" => "blocked",
        "blocked" => true,
        "message" => "User blocked successfully"
    ]);
}
>>>>>>> origin/main
