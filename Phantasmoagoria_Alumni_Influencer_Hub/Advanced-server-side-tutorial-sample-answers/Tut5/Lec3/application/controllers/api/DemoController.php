<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require APPPATH . 'libraries/RestController.php';
use chriskacerguis\RestServer\RestController;

class DemoController extends RestController {

    public function index_get()
    {
        echo "hello from rest";
    }
}