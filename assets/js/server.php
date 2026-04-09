<?php
$targetDir = "assets/images/";

if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $file = $_FILES['image'];
    $targetFile = $targetDir . basename($file['name']);

    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        echo json_encode(['url' => $targetFile]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Upload failed']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
}
?>