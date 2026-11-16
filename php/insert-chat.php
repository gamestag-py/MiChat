<<<<<<< HEAD

<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$sender_id = (int) $_SESSION['unique_id'];

$data = json_decode(file_get_contents("php://input"), true);

$incoming_id = (int) ($data['incoming_id'] ?? 0);
$encrypted_msg = $data['encrypted_msg'] ?? '';
$encrypted_key_sender = $data['encrypted_key_sender'] ?? '';
$encrypted_key_recipient = $data['encrypted_key_recipient'] ?? '';
$iv = $data['iv'] ?? '';

if (
    $incoming_id <= 0 ||
    empty($encrypted_msg) ||
    empty($encrypted_key_sender) ||
    empty($encrypted_key_recipient) ||
    empty($iv)
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing encrypted message data"
    ]);
    exit;
}

// Verify recipient exists
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "i", $incoming_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) === 0) {
    mysqli_stmt_close($stmt);

    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Recipient not found"
    ]);
    exit;
}

mysqli_stmt_close($stmt);


// =====================================
// CHECK IF RECEIVER BLOCKED THE SENDER
// =====================================

$stmt = mysqli_prepare(
    $conn,
    "SELECT id
     FROM user_blocks
     WHERE blocker_id = ?
       AND blocked_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param(
    $stmt,
    "ii",
    $incoming_id,
    $sender_id
);

mysqli_stmt_execute($stmt);

$blockResult = mysqli_stmt_get_result($stmt);
$isBlocked = mysqli_num_rows($blockResult) > 0;

mysqli_stmt_close($stmt);

if ($isBlocked) {
    http_response_code(403);

    echo json_encode([
        "success" => false,
        "blocked" => true,
        "message" => "You cannot send messages to this user."
    ]);

    exit;
}


// =====================================
// SAVE ENCRYPTED MESSAGE
// =====================================

$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO messages
    (
        incoming_msg_id,
        outgoing_msg_id,
        encrypted_msg,
        encrypted_key_sender,
        encrypted_key_recipient,
        iv
    )
    VALUES (?, ?, ?, ?, ?, ?)"
);

mysqli_stmt_bind_param(
    $stmt,
    "iissss",
    $incoming_id,
    $sender_id,
    $encrypted_msg,
    $encrypted_key_sender,
    $encrypted_key_recipient,
    $iv
);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        "success" => true,
        "message" => "Encrypted message sent",
        "msg_id" => mysqli_insert_id($conn)
    ]);
} else {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to save message"
    ]);
}

mysqli_stmt_close($stmt);
?>
=======

<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$sender_id = (int) $_SESSION['unique_id'];

$data = json_decode(file_get_contents("php://input"), true);

$incoming_id = (int) ($data['incoming_id'] ?? 0);
$encrypted_msg = $data['encrypted_msg'] ?? '';
$encrypted_key_sender = $data['encrypted_key_sender'] ?? '';
$encrypted_key_recipient = $data['encrypted_key_recipient'] ?? '';
$iv = $data['iv'] ?? '';

if (
    $incoming_id <= 0 ||
    empty($encrypted_msg) ||
    empty($encrypted_key_sender) ||
    empty($encrypted_key_recipient) ||
    empty($iv)
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing encrypted message data"
    ]);
    exit;
}

// Verify recipient exists
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id FROM users WHERE unique_id = ? LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "i", $incoming_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) === 0) {
    mysqli_stmt_close($stmt);

    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Recipient not found"
    ]);
    exit;
}

mysqli_stmt_close($stmt);


// =====================================
// CHECK IF RECEIVER BLOCKED THE SENDER
// =====================================

$stmt = mysqli_prepare(
    $conn,
    "SELECT id
     FROM user_blocks
     WHERE blocker_id = ?
       AND blocked_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param(
    $stmt,
    "ii",
    $incoming_id,
    $sender_id
);

mysqli_stmt_execute($stmt);

$blockResult = mysqli_stmt_get_result($stmt);
$isBlocked = mysqli_num_rows($blockResult) > 0;

mysqli_stmt_close($stmt);

if ($isBlocked) {
    http_response_code(403);

    echo json_encode([
        "success" => false,
        "blocked" => true,
        "message" => "You cannot send messages to this user."
    ]);

    exit;
}


// =====================================
// SAVE ENCRYPTED MESSAGE
// =====================================

$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO messages
    (
        incoming_msg_id,
        outgoing_msg_id,
        encrypted_msg,
        encrypted_key_sender,
        encrypted_key_recipient,
        iv
    )
    VALUES (?, ?, ?, ?, ?, ?)"
);

mysqli_stmt_bind_param(
    $stmt,
    "iissss",
    $incoming_id,
    $sender_id,
    $encrypted_msg,
    $encrypted_key_sender,
    $encrypted_key_recipient,
    $iv
);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        "success" => true,
        "message" => "Encrypted message sent",
        "msg_id" => mysqli_insert_id($conn)
    ]);
} else {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to save message"
    ]);
}

mysqli_stmt_close($stmt);
?>
>>>>>>> origin/main
