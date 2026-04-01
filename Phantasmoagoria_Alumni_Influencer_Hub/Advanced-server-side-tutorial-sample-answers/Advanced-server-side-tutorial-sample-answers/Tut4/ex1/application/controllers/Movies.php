<?php
defined('BASEPATH') or exit('No direct script access allowed');


class Movies extends CI_Controller
{

    public function __construct()
    {
        parent::__construct();
        $this->load->helper('url');
    }

    public function index()
    {
        $this->load->view('movieview');
    }

    public function search()
    {
        $genre = $this->input->post('genre');
        $this->load->model('Moviemodel');
        $data['movies'] = $this->Moviemodel->getByGenre($genre);
        $this->load->view('resultview', $data);
    }

    public function allmovies()
    {
        $this->load->model('Moviemodel');
        $data['movies'] = $this->Moviemodel->getAllMovies();
        $this->load->view('allview', $data);
    }

    public function add()
    {
        $this->load->view('addview');
    }

    public function create()
    {
        if ($this->input->method() !== 'post') {
            redirect('Movies/add');
            return;
        }

        $data = array(
            'title' => trim($this->input->post('title', true)),
            'director' => trim($this->input->post('director', true)),
            'genre' => trim($this->input->post('genre', true)),
            'imdb_rating' => trim($this->input->post('imdb_rating', true)),
            'release_year' => trim($this->input->post('release_year', true))
        );

        if (
            $data['title'] === '' || $data['director'] === '' || $data['genre'] === '' ||
            $data['imdb_rating'] === '' || $data['release_year'] === ''
        ) {
            $this->load->view('addview', array('error' => 'Please fill in all fields.'));
            return;
        }

        $this->load->model('Moviemodel');
        $this->Moviemodel->addMovie($data);
        redirect('Movies/allmovies');
    }

    public function delete($id = null)
    {
        if ($id === null || !ctype_digit($id)) {
            show_404();
            return;
        }

        $this->load->model('Moviemodel');
        $this->Moviemodel->deleteMovieById((int)$id);
        redirect('Movies/allmovies');
    }
}
