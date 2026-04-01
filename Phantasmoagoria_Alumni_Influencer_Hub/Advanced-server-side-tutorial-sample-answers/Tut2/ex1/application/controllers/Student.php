<?php
defined('BASEPATH') OR exit('No direct script access allowed');

// Note that the classname must start with a capital letter
// and MUST be in a file with the same name - e.g., the class
// called 'Student' and the file is called 'Student.php'
class Student extends CI_Controller {
    // define a (default) constructor - this is called when
    // an instance of this controller class is created in order
    // to service a request
    public function __construct() {
        parent::__construct();
    }

    // define the index method
    public function index() {
        // what web page do we want to generate and send back to the browser?
        // 'studentview' should correspond to a file called 'studentview.php' in
        // the views folder - i.e., the names should match
        $this->load->view('studentview');
    }
}