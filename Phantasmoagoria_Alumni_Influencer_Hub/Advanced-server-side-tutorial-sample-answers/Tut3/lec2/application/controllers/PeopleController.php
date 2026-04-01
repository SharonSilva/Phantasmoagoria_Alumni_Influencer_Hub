<?php
defined('BASEPATH') or exit('No direct script access allowed');

/**
 * @property People $people
 * @property CI_Input $input
 */
class PeopleController extends CI_Controller
{
    function __construct()
    {
        parent::__construct();
        $this->load->model('people');
        $this->load->helper('url');
    }

    function add()
    {
        $name = $this->input->post('name');
        $age = $this->input->post('age');
        $people = $this->people->addPerson($name, $age);
        $this->load->view('peopleview', array(
            'matches' => $people,
            'message' => 'Person added.'
        ));
    }

    function find()
    {
        $name = $this->input->get('q');
        $matches = $this->people->findPeople($name);
        $this->load->view('peopleview', array(
            'matches' => $matches,
            'query' => $name
        ));
    }
}
