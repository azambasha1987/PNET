<?php
/**
 * login/version.php — lightweight, pre-auth-safe JSON endpoint that hands the
 * login page the friendly PNetLab release string.
 */
if (file_exists('/opt/unetlab/html/includes/version.php')) {
    require_once '/opt/unetlab/html/includes/version.php';
}

$v = '6.8.93';
if (file_exists('/opt/unetlab/VERSION')) {
    $v_content = file_get_contents('/opt/unetlab/VERSION');
    if (preg_match('/VERSION=([0-9.]+)/', $v_content, $m)) {
        $v = $m[1];
    } elseif (preg_match('/^[0-9.]+/', trim($v_content), $m)) {
        $v = $m[0];
    }
} elseif (defined('PNET_RELEASE_VERSION') && !empty(PNET_RELEASE_VERSION)) {
    $v = PNET_RELEASE_VERSION;
} elseif (defined('PNET_PACKAGE_VERSION') && !empty(PNET_PACKAGE_VERSION)) {
    $v = preg_replace('/[a-zA-Z].*$/', '', PNET_PACKAGE_VERSION);
} elseif (defined('PNET_VERSION') && PNET_VERSION !== '8.2.0') {
    $v = PNET_VERSION;
}

header('Content-Type: application/json');
echo json_encode([
    'version' => $v,
    'release' => 'v' . $v,
]);
