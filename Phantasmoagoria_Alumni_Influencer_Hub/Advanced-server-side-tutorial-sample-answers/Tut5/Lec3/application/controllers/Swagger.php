<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Swagger extends CI_Controller
{
    public function index()
    {
        // Ensure base_url() and other URL helpers are available in the view
        $this->load->helper('url');
        $this->load->view('swagger_view');
    }
}

