<<<<<<< HEAD

<?php
session_start();
include_once "config.php";


header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Not authenticated"]);
    exit;
}

$user_id = (int) $_SESSION['unique_id'];

$fname = trim($_POST['fname'] ?? '');
$lname = trim($_POST['lname'] ?? '');
$bio = trim($_POST['bio'] ?? '');

if ($fname === '' || $lname === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Name is required"]);
    exit;
}

if (strlen($fname) > 50 || strlen($lname) > 50 || strlen($bio) > 300) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Input exceeds allowed length"]);
    exit;
}

// Get existing image
$stmt = mysqli_prepare(
    $conn,
    "SELECT img FROM users WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);

$user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$user) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "User not found"]);
    exit;
}

$image_name = $user['img'];

// Process optional image
if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {

    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Image upload failed"]);
        exit;
    }

    if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Image must be under 5 MB"]);
        exit;
    }

    $image_info = getimagesize($_FILES['image']['tmp_name']);

    if ($image_info === false) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid image"]);
        exit;
    }

    $allowed = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_GIF => 'gif',
        IMAGETYPE_WEBP => 'webp'
    ];

    $type = $image_info[2];

    if (!isset($allowed[$type])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Only JPG, PNG, GIF and WEBP are allowed"]);
        exit;
    }

    $image_name = bin2hex(random_bytes(16)) . '.' . $allowed[$type];

    $upload_dir = __DIR__ . '/images/';

    if (!is_dir($upload_dir) || !is_writable($upload_dir)) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Image directory unavailable"]);
        exit;
    }

    if (!move_uploaded_file(
        $_FILES['image']['tmp_name'],
        $upload_dir . $image_name
    )) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Could not save image"]);
        exit;
    }
}

// Update profile
$stmt = mysqli_prepare(
    $conn,
    "UPDATE users
     SET fname = ?, lname = ?, bio = ?, img = ?
     WHERE unique_id = ?"
);

mysqli_stmt_bind_param(
    $stmt,
    "ssssi",
    $fname,
    $lname,
    $bio,
    $image_name,
    $user_id
);

if (mysqli_stmt_execute($stmt)) {

    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully",
        "profile" => [
            "name" => $fname . " " . $lname,
            "fname" => $fname,
            "lname" => $lname,
            "bio" => $bio,
            "img" => $image_name
        ]
    ]);

} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Profile update failed"
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
    echo json_encode(["success" => false, "message" => "Not authenticated"]);
    exit;
}

$user_id = (int) $_SESSION['unique_id'];

$fname = trim($_POST['fname'] ?? '');
$lname = trim($_POST['lname'] ?? '');
$bio = trim($_POST['bio'] ?? '');

if ($fname === '' || $lname === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Name is required"]);
    exit;
}

if (strlen($fname) > 50 || strlen($lname) > 50 || strlen($bio) > 300) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Input exceeds allowed length"]);
    exit;
}

// Get existing image
$stmt = mysqli_prepare(
    $conn,
    "SELECT img FROM users WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);

$user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$user) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "User not found"]);
    exit;
}

$image_name = $user['img'];

// Process optional image
if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {

    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Image upload failed"]);
        exit;
    }

    if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Image must be under 5 MB"]);
        exit;
    }

    $image_info = getimagesize($_FILES['image']['tmp_name']);

    if ($image_info === false) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid image"]);
        exit;
    }

    $allowed = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_GIF => 'gif',
        IMAGETYPE_WEBP => 'webp'
    ];

    $type = $image_info[2];

    if (!isset($allowed[$type])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Only JPG, PNG, GIF and WEBP are allowed"]);
        exit;
    }

    $image_name = bin2hex(random_bytes(16)) . '.' . $allowed[$type];

    $upload_dir = __DIR__ . '/images/';

    if (!is_dir($upload_dir) || !is_writable($upload_dir)) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Image directory unavailable"]);
        exit;
    }

    if (!move_uploaded_file(
        $_FILES['image']['tmp_name'],
        $upload_dir . $image_name
    )) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Could not save image"]);
        exit;
    }
}

// Update profile
$stmt = mysqli_prepare(
    $conn,
    "UPDATE users
     SET fname = ?, lname = ?, bio = ?, img = ?
     WHERE unique_id = ?"
);

mysqli_stmt_bind_param(
    $stmt,
    "ssssi",
    $fname,
    $lname,
    $bio,
    $image_name,
    $user_id
);

if (mysqli_stmt_execute($stmt)) {

    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully",
        "profile" => [
            "name" => $fname . " " . $lname,
            "fname" => $fname,
            "lname" => $lname,
            "bio" => $bio,
            "img" => $image_name
        ]
    ]);

} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Profile update failed"
    ]);
}

mysqli_stmt_close($stmt);
?>
>>>>>>> origin/main
