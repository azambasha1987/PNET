<?php
/** Best-effort activity audit writes and strict admin-reader queries. */

defined('ACTIVITY_LOG_RETENTION_SECONDS') or define('ACTIVITY_LOG_RETENTION_SECONDS', 365 * 86400);

function activity_log_client_ip()
{
    // Apache serves clients directly on this appliance. Deliberately do not
    // trust client-supplied X-Forwarded-* headers (same policy as login throttle).
    return isset($_SERVER['REMOTE_ADDR']) ? substr((string) $_SERVER['REMOTE_ADDR'], 0, 45) : null;
}

function activity_log_session_id($token)
{
    return $token === null || $token === '' ? null : hash('sha256', (string) $token);
}

function activity_log_user_for_cookie($db, $cookie)
{
    if ($cookie === null || $cookie === '') return null;
    $statement = $db->prepare('SELECT pod,username FROM users WHERE cookie=:cookie LIMIT 1');
    $statement->execute(['cookie' => (string) $cookie]);
    $row = $statement->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function activity_log_lab_path($lab)
{
    if (!is_object($lab) || !method_exists($lab, 'getFile')) return null;
    $file = (string) $lab->getFile();
    return strpos($file, BASE_LAB) === 0 ? substr($file, strlen(BASE_LAB)) : $file;
}

function activity_log_node_data($node)
{
    if (!is_object($node)) return ['node_name' => null, 'node_template' => null];
    return [
        'node_name' => method_exists($node, 'getName') ? (string) $node->getName() : null,
        'node_template' => method_exists($node, 'getTemplate') ? (string) $node->getTemplate() : null,
    ];
}

function activity_log_event($db, $user, $category, $action, $options = [])
{
    try {
        if (!$db) $db = checkDatabase();
        if (!$db) throw new RuntimeException('database unavailable');
        $now = time();
        $sessionId = isset($options['session_id']) ? $options['session_id'] : null;
        $duration = null;
        if ($category === 'session' && $action === 'logout' && $sessionId) {
            $login = $db->prepare(
                "SELECT created_at FROM activity_log WHERE category='session' AND action='login' AND session_id=:session_id ORDER BY id DESC LIMIT 1"
            );
            $login->execute(['session_id' => $sessionId]);
            $loginAt = $login->fetchColumn();
            if ($loginAt !== false) $duration = max(0, $now - (int) $loginAt);
        }
        $detail = $options['detail'] ?? null;
        if (is_array($detail) || is_object($detail)) {
            $detail = json_encode($detail, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        $insert = $db->prepare(
            'INSERT INTO activity_log (created_at,pod,username,ip,category,action,lab_path,lab_name,node_name,node_template,detail,session_id,duration_seconds) ' .
            'VALUES (:created_at,:pod,:username,:ip,:category,:action,:lab_path,:lab_name,:node_name,:node_template,:detail,:session_id,:duration_seconds)'
        );
        $insert->execute([
            'created_at' => $now,
            'pod' => isset($user['pod']) ? (int) $user['pod'] : null,
            'username' => isset($user['username']) ? substr((string) $user['username'], 0, 150) : 'unknown',
            'ip' => activity_log_client_ip(),
            'category' => substr((string) $category, 0, 16),
            'action' => substr((string) $action, 0, 32),
            'lab_path' => isset($options['lab_path']) ? substr((string) $options['lab_path'], 0, 1024) : null,
            'lab_name' => isset($options['lab_name']) ? substr((string) $options['lab_name'], 0, 255) : null,
            'node_name' => isset($options['node_name']) ? substr((string) $options['node_name'], 0, 255) : null,
            'node_template' => isset($options['node_template']) ? substr((string) $options['node_template'], 0, 64) : null,
            'detail' => $detail,
            'session_id' => $sessionId,
            'duration_seconds' => $duration,
        ]);

        // Fixed policy: retain one year. The created_at index makes the empty
        // case cheap; LIMIT bounds cleanup work on an old/busy appliance.
        $prune = $db->prepare('DELETE FROM activity_log WHERE created_at<:cutoff ORDER BY created_at LIMIT 1000');
        $prune->execute(['cutoff' => $now - ACTIVITY_LOG_RETENTION_SECONDS]);
        return true;
    } catch (Throwable $e) {
        error_log(date('M d H:i:s ') . 'WARNING: activity log write failed for ' . $category . '/' . $action . ': ' . $e->getMessage());
        return false;
    }
}

function activity_log_sweep_idle_sessions($db)
{
    try {
        if (!$db) $db = checkDatabase();
        if (!$db) return;
        $now = time();
        $timeout = function_exists('getSessionTimeoutSeconds') ? getSessionTimeoutSeconds() : 3600;

        // Find login sessions that have no matching logout or idle_logout event
        $query = "
            SELECT l.id, l.created_at, l.pod, l.username, l.ip, l.session_id
            FROM activity_log l
            LEFT JOIN activity_log o 
                ON l.session_id = o.session_id 
                AND o.category = 'session' 
                AND (o.action = 'logout' OR o.action = 'idle_logout')
            WHERE l.category = 'session' 
              AND l.action = 'login' 
              AND l.session_id IS NOT NULL 
              AND o.id IS NULL
              AND l.created_at < :cutoff
            LIMIT 100
        ";
        $st = $db->prepare($query);
        $st->execute(['cutoff' => $now - $timeout]);
        $dangling = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($dangling as $sess) {
            $loginAt = (int) $sess['created_at'];
            $expiredAt = $loginAt + $timeout;
            if ($expiredAt > $now) $expiredAt = $now;
            $duration = max(0, $expiredAt - $loginAt);

            $ins = $db->prepare('
                INSERT INTO activity_log (created_at, pod, username, ip, category, action, detail, session_id, duration_seconds)
                VALUES (:created_at, :pod, :username, :ip, "session", "idle_logout", "idle_timeout", :session_id, :duration_seconds)
            ');
            $ins->execute([
                'created_at' => $expiredAt,
                'pod' => $sess['pod'],
                'username' => $sess['username'],
                'ip' => $sess['ip'],
                'session_id' => $sess['session_id'],
                'duration_seconds' => $duration
            ]);
        }
    } catch (Throwable $e) {
        error_log('activity log idle sweep notice: ' . $e->getMessage());
    }
}

// Free-text filter: every word must match a stored column or the event text the
// Logs page shows for the row (action holds "create", the page says "Lab created").
function activity_log_search_clauses($search, &$params)
{
    $columns = ['username', 'ip', 'category', 'action', 'lab_name', 'lab_path', 'node_name', 'node_template'];
    $eventText = [
        'create' => 'created', 'delete' => 'deleted', 'destroy' => 'destroyed', 'join' => 'joined',
        'duplicate' => 'duplicated', 'wipe' => 'wiped', 'rename' => 'renamed',
        'login' => 'logged in', 'logout' => 'logged out', 'idle_logout' => 'logged out (idle timeout)',
    ];
    $words = preg_split('/\s+/', trim((string) $search), -1, PREG_SPLIT_NO_EMPTY);
    $clauses = [];
    foreach (array_slice($words ?: [], 0, 8) as $w => $word) {
        $like = '%' . strtr($word, ['|' => '||', '%' => '|%', '_' => '|_']) . '%';
        $any = [];
        foreach ($columns as $c => $column) {
            $key = 'search_' . $w . '_' . $c;
            $any[] = $column . ' LIKE :' . $key . " ESCAPE '|'";
            $params[$key] = $like;
        }
        foreach ($eventText as $action => $text) {
            if (stripos($text, $word) === false) continue;
            $key = 'search_' . $w . '_' . $action;
            $any[] = 'action=:' . $key;
            $params[$key] = $action;
        }
        $clauses[] = '(' . implode(' OR ', $any) . ')';
    }
    return $clauses;
}

function activity_log_fetch($db, $categories, $limit, $offset, $search = '')
{
    $allowed = ['lab', 'node', 'session'];
    $categories = array_values(array_intersect($allowed, (array) $categories));
    if (!$categories) $categories = $allowed;
    if (in_array('session', $categories, true)) {
        activity_log_sweep_idle_sessions($db);
    }
    $params = [];
    $marks = [];
    foreach ($categories as $index => $category) {
        $key = 'category_' . $index;
        $marks[] = ':' . $key;
        $params[$key] = $category;
    }
    $limit = max(1, min(200, (int) $limit));
    $offset = max(0, (int) $offset);
    $where = implode(' AND ', array_merge(
        ['category IN (' . implode(',', $marks) . ')'],
        activity_log_search_clauses($search, $params)
    ));
    $statement = $db->prepare(
        'SELECT id,created_at,pod,username,ip,category,action,lab_path,lab_name,node_name,node_template,detail,duration_seconds ' .
        'FROM activity_log WHERE ' . $where . ' ORDER BY id DESC LIMIT ' . $limit . ' OFFSET ' . $offset
    );
    $statement->execute($params);
    $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
    $count = $db->prepare('SELECT COUNT(*) FROM activity_log WHERE ' . $where);
    $count->execute($params);
    return ['data' => $rows, 'total' => (int) $count->fetchColumn()];
}
