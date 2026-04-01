<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class HomeController extends CI_Controller {

	public function homePage($name = '')
    {
        $this ->load->view('homeView', ['name' => $name]);
    }
}
