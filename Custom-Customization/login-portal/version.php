<?php
/**
 * login/version.php — lightweight, pre-auth-safe JSON endpoint that hands the
 * login page the friendly PNetLab release string.
 */
require_once '/opt/unetlab/html/includes/version.php';
header('Content-Type: application/json');
echo json_encode([
    'version' => defined('PNET_VERSION') ? PNET_VERSION : '6.8.93',
    'release' => defined('PNET_RELEASE') ? PNET_RELEASE : '6.8.93',
]);

