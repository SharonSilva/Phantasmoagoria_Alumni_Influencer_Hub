<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Student extends CI_Controller {
 
    public function __construct() {
        parent::__construct();
    }

    public function index() {
        // to pass data to a view, we need to first create an associative array

        $data = array(
            'studentName' => 'Izuku Midoriya',
            'studentImage' => 'https://www.nahsvikingsaga.org/wp-content/uploads/2020/11/DEKU.png',
            'studentSchool' => 'U. A. High School',
            'studentClass'  => '1-A'
        );


        // The data we want to pass to the view to be displayed is passed as the second argument
        // to the view() function.  The keys in the associative array will be turned into
        // PHP variables in the view file (using a built-in PHP function called 'explode').
        $this->load->view('studentview',$data);
    }
}