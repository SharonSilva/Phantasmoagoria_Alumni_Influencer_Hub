<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$config['base_url'] = 'http://localhost/tutorials/Tut5/Tut/';
$config['index_page'] = 'index.php';
$config['uri_protocol'] = 'REQUEST_URI';

$config['charset'] = 'UTF-8';
$config['enable_hooks'] = FALSE;

$config['subclass_prefix'] = 'MY_';

$config['composer_autoload'] = FALSE;

$config['permitted_uri_chars'] = 'a-z 0-9~%.:_\-';

$config['enable_query_strings'] = FALSE;
$config['controller_trigger'] = 'c';
$config['function_trigger'] = 'm';
$config['directory_trigger'] = 'd';

$config['log_threshold'] = 4;
$config['log_path'] = ''; // empty = application/logs/

$config['encryption_key'] = 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING';

$config['sess_driver'] = 'files';
$config['sess_cookie_name'] = 'ci_session';
$config['sess_expiration'] = 7200;
$config['sess_save_path'] = APPPATH . 'cache/sessions';// or APPPATH.'cache/sessions'
$config['sess_match_ip'] = FALSE;
$config['sess_time_to_update'] = 300;
$config['sess_regenerate_destroy'] = FALSE;

$config['cookie_prefix']  = '';
$config['cookie_domain']  = '';
$config['cookie_path']    = '/';
$config['cookie_secure']  = FALSE;
$config['cookie_httponly'] = FALSE;

$config['csrf_protection'] = FALSE;