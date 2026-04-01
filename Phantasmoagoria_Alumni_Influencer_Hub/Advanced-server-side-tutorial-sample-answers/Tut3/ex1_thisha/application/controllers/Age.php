<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * @property AgeModel $AgeModel
 * @property CI_Input $input
 */
class Age extends CI_Controller {

    public function __construct()
    {
        parent::__construct();
        $this->load->model('AgeModel');
        $this->load->helper('url');
    }

    // Show the form
    public function index()
    {
        $this->load->view('age_form');
    }

    // Handle form submission
    public function calculate()
    {
        $dateOfBirth = $this->input->post('dob');

        $age = $this->AgeModel->calculate_age($dateOfBirth);

        $data['age'] = $age;

        $this->load->view('age_result', $data);
    }
}
