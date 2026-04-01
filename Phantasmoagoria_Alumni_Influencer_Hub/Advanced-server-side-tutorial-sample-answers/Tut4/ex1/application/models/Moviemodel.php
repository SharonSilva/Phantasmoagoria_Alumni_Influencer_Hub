<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Moviemodel extends CI_Model
{

    public function getByGenre($genre)
    {
        $this->db->where('genre', $genre);
        $query = $this->db->get('films');

        if ($query->num_rows() > 0) {
            return $query->result();
        } else {
            return false;
        }
    }

    public function getAllMovies()
    {
        $query = $this->db->get('films');
        return $query->result();
    }

    public function addMovie($data)
    {
        return $this->db->insert('films', $data);
    }

    public function deleteMovieById($id)
    {
        $this->db->where('id', $id);
        return $this->db->delete('films');
    }
}
