<<<<<<< HEAD

<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

// Step 1: Check login session
if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "User not authenticated"
    ]);
    exit;
}

$unique_id = (int) $_SESSION['unique_id'];

// Step 2: Get JSON request
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['public_key'])) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Public key is required"
    ]);
    exit;
}

$public_key = $data['public_key'];

// Step 3: Validate RSA public key structure
if (
    !is_array($public_key) ||
    ($public_key['kty'] ?? '') !== 'RSA' ||
    empty($public_key['n']) ||
    empty($public_key['e']) ||
    ($public_key['alg'] ?? '') !== 'RSA-OAEP-256'
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid RSA public key"
    ]);
    exit;
}

// Step 4: Verify user exists
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id FROM users WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "i", $unique_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) === 0) {
    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
    exit;
}

mysqli_stmt_close($stmt);

// Step 5: Encode public key
$public_key_json = json_encode($public_key);

if ($public_key_json === false) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid public key format"
    ]);
    exit;
}

// Step 6: Insert or update public key
$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO user_public_keys (unique_id, public_key)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)"
);

mysqli_stmt_bind_param(
    $stmt,
    "is",
    $unique_id,
    $public_key_json
);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        "success" => true,
        "message" => "Public key saved successfully",
        "key_id" => mysqli_insert_id($conn)
    ]);
} else {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to save public key"
    ]);
}

mysqli_stmt_close($stmt);
?>
=======

<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

// Step 1: Check login session
if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "User not authenticated"
    ]);
    exit;
}

$unique_id = (int) $_SESSION['unique_id'];

// Step 2: Get JSON request
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['public_key'])) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Public key is required"
    ]);
    exit;
}

$public_key = $data['public_key'];

// Step 3: Validate RSA public key structure
if (
    !is_array($public_key) ||
    ($public_key['kty'] ?? '') !== 'RSA' ||
    empty($public_key['n']) ||
    empty($public_key['e']) ||
    ($public_key['alg'] ?? '') !== 'RSA-OAEP-256'
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid RSA public key"
    ]);
    exit;
}

// Step 4: Verify user exists
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id FROM users WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "i", $unique_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($result) === 0) {
    http_response_code(404);

    echo json_encode([
        "success" => false,
        "message" => "User not found"
    ]);
    exit;
}

mysqli_stmt_close($stmt);

// Step 5: Encode public key
$public_key_json = json_encode($public_key);

if ($public_key_json === false) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid public key format"
    ]);
    exit;
}

// Step 6: Insert or update public key
$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO user_public_keys (unique_id, public_key)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)"
);

mysqli_stmt_bind_param(
    $stmt,
    "is",
    $unique_id,
    $public_key_json
);

if (mysqli_stmt_execute($stmt)) {
    echo json_encode([
        "success" => true,
        "message" => "Public key saved successfully",
        "key_id" => mysqli_insert_id($conn)
    ]);
} else {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Failed to save public key"
    ]);
}

mysqli_stmt_close($stmt);
?>
>>>>>>> origin/main
