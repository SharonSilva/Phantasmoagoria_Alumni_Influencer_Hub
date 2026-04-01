<?php
defined('BASEPATH') OR exit('No direct script access allowed');
/*
|--------------------------------------------------------------------------
| Todo Model
|--------------------------------------------------------------------------
| Handles database interaction
*/
class Todo_model extends CI_Model { //extending CI_Model gives us access to the database library via $this->db

    private $table = 'todo_actions';
    /*
    |--------------------------------------------------------------------------
    | Add new To-Do item
    |--------------------------------------------------------------------------
    */
    public function add_action($user_id, $title) {
        $data = array(
            'user_id' => $user_id,
            'action_title' => $title
        );
        return $this->db->insert($this->table, $data);
    }
    /*
    |--------------------------------------------------------------------------
    | Retrieve all To-Do items for a specific user
    |--------------------------------------------------------------------------
    */
    public function get_actions($user_id) {
        return $this->db
            ->where('user_id', $user_id)
            ->order_by('created_at', 'DESC')
            ->get($this->table)
            ->result();
    }
    /*
    |--------------------------------------------------------------------------
    | Delete a To-Do item (only if it belongs to user)
    |--------------------------------------------------------------------------
    */
    public function delete_action($user_id, $id) {
        return $this->db
            ->where('user_id', $user_id)
            ->where('id', (int)$id)
            ->delete($this->table);
    }
}