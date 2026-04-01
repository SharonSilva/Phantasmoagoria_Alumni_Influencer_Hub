<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| Todo Controller
|--------------------------------------------------------------------------
| Handles:
| - Loading the To-Do page
| - Creating a unique session user ID
| - Adding new To-Do actions
| - Deleting actions
*/

class Todo extends CI_Controller {

    // Constant key name used for storing user id in session
    const SESSION_USER_KEY = 'todo_user_id';

    public function __construct() {
        parent::__construct();
        // Todo_model is autoloaded, session is autoloaded
        
        /*
        |--------------------------------------------------------------------------
        | Exercise 3 – Ensure user has a unique session ID
        |--------------------------------------------------------------------------
        | When the controller loads:
        | 1. Check if a user_id exists in session.
        | 2. If not, generate one using uniqid().
        | 3. Store it in session.
        */

        $this->ensure_user_id();
    }

    private function ensure_user_id() {
        // Retrieve user_id from session
        $user_id = $this->session->userdata(self::SESSION_USER_KEY); //set userdata is part of the Session Library

        // If no ID exists, generate one
        if (!$user_id) {
            // uniqid() creates a unique string based on current time
            $user_id = uniqid('u_', true);
            $this->session->set_userdata(self::SESSION_USER_KEY, $user_id); // Store the generated ID inside CI session

            // Log it (Exercise 4 – logging)
            log_message('info', 'Generated new todo user_id: ' . $user_id);
        } else {
            // Log existing ID
            log_message('debug', 'Existing todo user_id in session: ' . $user_id);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Function: index()
    |--------------------------------------------------------------------------
    | Loads:
    | - Existing actions from database
    | - Passes them to the view
    */

    public function index() {
        log_message('info', 'Todo index page loaded');
        $user_id = $this->session->userdata(self::SESSION_USER_KEY);

        // Log the user ID being used to load the page
        $data = array(
            'user_id' => $user_id,
            'actions' => $this->Todo_model->get_actions($user_id),
            'error'   => '',
            'success' => $this->session->flashdata('success')
        );
        // Send data to view
        $this->load->view('todo_view', $data);
    }

    public function add() {
        $user_id = $this->session->userdata(self::SESSION_USER_KEY);

        // Validate input field
        $this->form_validation->set_rules('action_title', 
        'Action Title', 
        'required|trim|min_length[2]|max_length[255]');
        
         // If validation fails, reload page with error
        if ($this->form_validation->run() === FALSE) {
            log_message('debug', 'Validation failed: ' . validation_errors());

            $data = array(
                'user_id' => $user_id,
                'actions' => $this->Todo_model->get_actions($user_id),
                'error'   => validation_errors(),
                'success' => ''
            );

            $this->load->view('todo_view', $data);
            return;
            log_message('info', "Inserted todo action for user_id={$user_id}: {$title}");
        }

        // Get sanitized input
        $title = $this->input->post('action_title', TRUE);

        // Insert into database
        $ok = $this->Todo_model->add_action($user_id, $title);

        if ($ok) {
            log_message('info', "Inserted todo action for user_id={$user_id}: {$title}");
            $this->session->set_flashdata('success', 'To-Do added!');
        } else {
            log_message('error', "DB insert failed for user_id={$user_id}: {$title}");
            $this->session->set_flashdata('success', '');
        }

        redirect('todo');
    }

    public function delete($id = null) {
        $user_id = $this->session->userdata(self::SESSION_USER_KEY);

        if ($id === null) {
            show_404();
        }

        // Delete only if it belongs to current session user
        $this->Todo_model->delete_action($user_id, $id);
        log_message('info', "Deleted todo action id={$id} for user_id={$user_id}");

        redirect('todo');
    }
}