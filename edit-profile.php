
<?php
session_start();
require_once "php/config.php";

if (!isset($_SESSION['unique_id'])) {
    header("Location: login.php");
    exit;
}

$uniqueId = $_SESSION['unique_id'];

$stmt = mysqli_prepare(
    $conn,
    "SELECT fname, lname, email, img, bio FROM users WHERE unique_id = ? LIMIT 1"
);
mysqli_stmt_bind_param($stmt, "s", $uniqueId);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$user) {
    die("User not found.");
}

$errors = [];
$success = "";

if (empty($_SESSION['profile_csrf'])) {
    $_SESSION['profile_csrf'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';

    if (!hash_equals($_SESSION['profile_csrf'], $csrf)) {
        $errors[] = "Invalid request. Please refresh the page.";
    } else {
        $fname = trim($_POST['fname'] ?? '');
        $lname = trim($_POST['lname'] ?? '');
        $bio = trim($_POST['bio'] ?? '');

        if ($fname === '' || $lname === '') {
            $errors[] = "First name and last name are required.";
        }

        if (mb_strlen($fname) > 255 || mb_strlen($lname) > 255) {
            $errors[] = "Name cannot exceed 255 characters.";
        }

        if (mb_strlen($bio) > 300) {
            $errors[] = "Bio cannot exceed 300 characters.";
        }

        $imageName = $user['img'];

        if (
            isset($_FILES['profile_photo']) &&
            $_FILES['profile_photo']['error'] !== UPLOAD_ERR_NO_FILE
        ) {
            $file = $_FILES['profile_photo'];

            if ($file['error'] !== UPLOAD_ERR_OK) {
                $errors[] = "Image upload failed.";
            } elseif ($file['size'] > 5 * 1024 * 1024) {
                $errors[] = "Image must be smaller than 5 MB.";
            } else {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->file($file['tmp_name']);

                $allowedTypes = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp'
                ];

                if (!isset($allowedTypes[$mime])) {
                    $errors[] = "Only JPG, PNG and WEBP images are allowed.";
                } else {
                    $uploadDir = __DIR__ . "/php/images/";

                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }

                    if (!is_writable($uploadDir)) {
                        $errors[] = "Image upload directory is not writable.";
                    } else {
                        $newName = bin2hex(random_bytes(16))
                            . "." . $allowedTypes[$mime];

                        if (move_uploaded_file(
                            $file['tmp_name'],
                            $uploadDir . $newName
                        )) {
                            $imageName = $newName;
                        } else {
                            $errors[] = "Could not save profile photo.";
                        }
                    }
                }
            }
        }

        if (empty($errors)) {
            $stmt = mysqli_prepare(
                $conn,
                "UPDATE users
                 SET fname = ?, lname = ?, bio = ?, img = ?
                 WHERE unique_id = ?"
            );

            mysqli_stmt_bind_param(
                $stmt,
                "sssss",
                $fname,
                $lname,
                $bio,
                $imageName,
                $uniqueId
            );

            if (mysqli_stmt_execute($stmt)) {
                $user['fname'] = $fname;
                $user['lname'] = $lname;
                $user['bio'] = $bio;
                $user['img'] = $imageName;

                $success = "Profile updated successfully.";
            } else {
                $errors[] = "Something went wrong. Please try again.";
            }

            mysqli_stmt_close($stmt);
        }
    }
}

function e($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

$photo = !empty($user['img'])
    ? "/php/images/" . rawurlencode($user['img'])
    : "/php/images/default-avatar.png";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profile | MiChat</title>

    <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <style>
        :root {
            --bg: #111318;
            --surface: #191c23;
            --surface2: #20242d;
            --border: #2c303a;
            --text: #f1f2f5;
            --muted: #9299a8;
            --primary: #6c8cff;
            --danger: #ef5350;
            --success: #35c98a;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: var(--bg);
            color: var(--text);
            font-family: Arial, sans-serif;
            min-height: 100vh;
        }

        button, input, textarea {
            font: inherit;
        }

        .settings-layout {
            max-width: 1050px;
            margin: auto;
            padding: 35px 22px;
        }

        .settings-header {
            margin-bottom: 30px;
        }

        .settings-header h1 {
            font-size: 26px;
            margin-bottom: 9px;
        }

        .settings-header p {
            color: var(--muted);
            font-size: 14px;
        }

        .settings-grid {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: 24px;
            align-items: start;
        }

        .settings-sidebar,
        .settings-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 13px;
        }

        .settings-sidebar {
            padding: 12px;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 13px;
            border-radius: 8px;
            color: var(--muted);
            font-size: 14px;
            text-decoration: none;
        }

        .sidebar-item.active {
            background: var(--surface2);
            color: var(--text);
        }

        .sidebar-item i {
            width: 18px;
        }

        .settings-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .settings-card {
            padding: 24px;
        }

        .card-heading {
            display: flex;
            align-items: center;
            gap: 13px;
            margin-bottom: 24px;
        }

        .card-icon {
            width: 42px;
            height: 42px;
            background: var(--surface2);
            border-radius: 10px;
            display: grid;
            place-items: center;
            color: var(--primary);
            font-size: 17px;
        }

        .card-heading h2 {
            font-size: 17px;
            margin-bottom: 5px;
        }

        .card-heading p {
            color: var(--muted);
            font-size: 12px;
        }

        .profile-photo-section {
            display: flex;
            align-items: center;
            gap: 22px;
            margin-bottom: 28px;
        }

        .avatar-wrap {
            position: relative;
            width: 100px;
            height: 100px;
            flex-shrink: 0;
        }

        .avatar-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            border: 3px solid var(--border);
            background: var(--surface2);
        }

        .photo-upload {
            display: flex;
            flex-direction: column;
            gap: 9px;
        }

        .photo-upload p {
            color: var(--muted);
            font-size: 12px;
            line-height: 1.5;
        }

        .upload-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            width: fit-content;
            border-radius: 7px;
            background: var(--surface2);
            border: 1px solid var(--border);
            color: var(--text);
            font-size: 13px;
            cursor: pointer;
        }

        .upload-button:hover {
            border-color: var(--primary);
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 9px;
            font-size: 13px;
            font-weight: 600;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 13px 14px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--surface2);
            color: var(--text);
            outline: none;
            transition: border .2s;
        }

        .form-group input {
            height: 46px;
        }

        .form-group textarea {
            min-height: 110px;
            resize: vertical;
            line-height: 1.5;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            border-color: var(--primary);
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
            color: #707786;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .bio-footer {
            display: flex;
            justify-content: space-between;
            margin-top: 7px;
            color: var(--muted);
            font-size: 11px;
        }

        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 18px;
            border-radius: 8px;
            border: 1px solid var(--border);
            cursor: pointer;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
        }

        .btn-secondary {
            background: var(--surface2);
            color: var(--text);
        }

        .btn-primary {
            background: var(--primary);
            color: #fff;
            border-color: var(--primary);
        }

        .btn-primary:hover {
            opacity: .9;
        }

        .alert {
            padding: 13px 15px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 18px;
        }

        .alert-success {
            background: rgba(53, 201, 138, .1);
            color: var(--success);
            border: 1px solid rgba(53, 201, 138, .25);
        }

        .alert-error {
            background: rgba(239, 83, 80, .1);
            color: var(--danger);
            border: 1px solid rgba(239, 83, 80, .25);
        }

        .email-note {
            color: var(--muted);
            font-size: 12px;
            margin-top: 8px;
        }

        @media(max-width: 700px) {
            .settings-layout {
                padding: 25px 15px;
            }

            .settings-grid {
                grid-template-columns: 1fr;
            }

            .settings-sidebar {
                display: flex;
                overflow-x: auto;
                gap: 5px;
            }

            .sidebar-item {
                white-space: nowrap;
            }

            .settings-card {
                padding: 18px;
            }
        }

        @media(max-width: 480px) {
            .form-row {
                grid-template-columns: 1fr;
                gap: 0;
            }

            .profile-photo-section {
                align-items: flex-start;
                gap: 15px;
            }

            .avatar-wrap {
                width: 80px;
                height: 80px;
            }

            .form-actions {
                flex-direction: column-reverse;
            }

            .form-actions .btn {
                width: 100%;
            }
        }
    </style>
</head>

<body>

<div class="settings-layout">

    <header class="settings-header">
        <h1>Edit Profile</h1>
        <p>Manage your personal information and how others see you.</p>
    </header>

    <div class="settings-grid">

        <aside class="settings-sidebar">
            <a href="settings.php" class="sidebar-item">
                <i class="fa-solid fa-gear"></i>
                Settings
            </a>

            <a href="edit-profile.php" class="sidebar-item active">
                <i class="fa-solid fa-user-pen"></i>
                Edit Profile
            </a>

            <a href="users.php" class="sidebar-item">
                <i class="fa-solid fa-comments"></i>
                Back to Chats
            </a>
        </aside>

        <main class="settings-content">

            <section class="settings-card">

                <div class="card-heading">
                    <div class="card-icon">
                        <i class="fa-solid fa-user"></i>
                    </div>

                    <div>
                        <h2>Personal Information</h2>
                        <p>Update your profile details.</p>
                    </div>
                </div>

                <?php if ($success): ?>
                    <div class="alert alert-success">
                        <i class="fa-solid fa-circle-check"></i>
                        <?= e($success) ?>
                    </div>
                <?php endif; ?>

                <?php if (!empty($errors)): ?>
                    <div class="alert alert-error">
                        <?php foreach ($errors as $error): ?>
                            <div><?= e($error) ?></div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>

                <form method="POST"
                      enctype="multipart/form-data"
                      id="profileForm">

                    <input type="hidden"
                           name="csrf_token"
                           value="<?= e($_SESSION['profile_csrf']) ?>">

                    <div class="profile-photo-section">

                        <div class="avatar-wrap">
                            <img src="<?= e($photo) ?>"
                                 id="profilePreview"
                                 alt="Profile photo">
                        </div>

                        <div class="photo-upload">
                            <label for="profilePhoto" class="upload-button">
                                <i class="fa-solid fa-camera"></i>
                                Change Photo
                            </label>

                            <input type="file"
                                   name="profile_photo"
                                   id="profilePhoto"
                                   accept="image/jpeg,image/png,image/webp"
                                   hidden>

                            <p>JPG, PNG or WEBP. Maximum size 5 MB.</p>
                            <p id="fileName"></p>
                        </div>

                    </div>

                    <div class="form-row">

                        <div class="form-group">
                            <label for="fname">First Name</label>
                            <input type="text"
                                   id="fname"
                                   name="fname"
                                   maxlength="255"
                                   value="<?= e($user['fname']) ?>"
                                   placeholder="Enter first name"
                                   required>
                        </div>

                        <div class="form-group">
                            <label for="lname">Last Name</label>
                            <input type="text"
                                   id="lname"
                                   name="lname"
                                   maxlength="255"
                                   value="<?= e($user['lname']) ?>"
                                   placeholder="Enter last name"
                                   required>
                        </div>

                    </div>

                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email"
                               id="email"
                               value="<?= e($user['email']) ?>"
                               disabled>

                        <p class="email-note">
                            Your email address cannot be changed here.
                        </p>
                    </div>

                    <div class="form-group">
                        <label for="bio">About You</label>

                        <textarea id="bio"
                                  name="bio"
                                  maxlength="300"
                                  placeholder="Write something about yourself..."><?= e($user['bio'] ?? '') ?></textarea>

                        <div class="bio-footer">
                            <span>Tell people a little about yourself.</span>
                            <span id="bioCount">0 / 300</span>
                        </div>
                    </div>

                    <div class="form-actions">
                        <a href="users.php" class="btn btn-secondary">
                            Cancel
                        </a>

                        <button type="submit" class="btn btn-primary">
                            <i class="fa-solid fa-floppy-disk"></i>
                            Save Changes
                        </button>
                    </div>

                </form>

            </section>

        </main>

    </div>
</div>

<script>
const photoInput = document.getElementById("profilePhoto");
const preview = document.getElementById("profilePreview");
const fileName = document.getElementById("fileName");
const bio = document.getElementById("bio");
const bioCount = document.getElementById("bioCount");

photoInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        alert("Please select a JPG, PNG or WEBP image.");
        this.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5 MB.");
        this.value = "";
        return;
    }

    preview.src = URL.createObjectURL(file);
    fileName.textContent = file.name;
});

function updateBioCount() {
    bioCount.textContent = `${bio.value.length} / 300`;
}

bio.addEventListener("input", updateBioCount);
updateBioCount();
</script>

</body>
</html>
