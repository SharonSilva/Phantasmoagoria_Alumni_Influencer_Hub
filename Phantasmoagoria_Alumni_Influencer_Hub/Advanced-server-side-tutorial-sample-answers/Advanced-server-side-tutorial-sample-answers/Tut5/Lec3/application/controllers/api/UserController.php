<?php
defined('BASEPATH') OR exit('No direct script access allowed');

require APPPATH . 'libraries/RestController.php';
use chriskacerguis\RestServer\RestController;

class UserController extends RestController {

    public function __construct()
    {
        parent::__construct();
        $this->load->model('UserModel');
    }

    public function index_get()
    {
        $users = $this->UserModel->get_users();
        $this->response([
            'status' => true,
            'message' => 'Users fetched successfully',
            'data' => $users
        ], 200);
    }

    public function insert_post()
    {
        $data=[
            'first_name' => $this->post('fname'),
            'last_name' => $this->post('lname'),
            'email' => $this->post('email'),
            'password_hash' => password_hash($this->post('password'), PASSWORD_BCRYPT),
        ];
        $id = $this->UserModel->insert_user($data);
        if ($id) {
            $this->response([
                'status' => true,
                'message' => 'User inserted successfully',
                'data' => $data
            ], 200);
        } else {
            $this->response([
                'status' => false,
                'message' => 'User insertion failed',
            ], 400);
        }
    }

    public function getbyid_get($id)
    {
        $user = $this->UserModel->getbyid($id);
        if ($user) {
            $this->response([
                'status' => true,
                'message' => 'User fetched successfully',
                'data' => $user
            ], 200);
        } else {
            $this->response([
                'status' => false,
                'message' => 'User not found',
            ], 404);
        }
    }

    public function update_put($id)
    {
        $password = $this->put('password');

        $data = [
            'first_name'    => $this->put('fname'),
            'last_name'     => $this->put('lname'),
            'email'         => $this->put('email'),
            'password_hash' => $password !== null && $password !== ''
                ? password_hash($password, PASSWORD_BCRYPT)
                : null,
        ];

        // Remove null values so that only sent fields are updated
        $data = array_filter($data, function ($value) {
            return $value !== null;
        });

        if (empty($data)) {
            return $this->response([
                'status'  => false,
                'message' => 'No data to update',
            ], 400);
        }

        $result = $this->UserModel->update_user($id, $data);

        if ($result) {
            $this->response([
                'status'  => true,
                'message' => 'User updated successfully',
                'data'    => $data,
            ], 200);
        } else {
            $this->response([
                'status'  => false,
                'message' => 'User update failed',
            ], 400);
        }
    }

    public function deletebyid_delete($id)
    {
        $result = $this->UserModel->delete_user($id);
        if ($result) {
            $this->response([
                'status' => true,
                'message' => 'User deleted successfully',
            ], 200);
        } else {
            $this->response([
                'status' => false,
                'message' => 'User deletion failed',
            ], 400);
        }
    }
}