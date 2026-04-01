<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Movies extends CI_Controller {

	public function index()
	{
		$apiKey = getenv('OMDB_API_KEY');
		if (empty($apiKey)) {
			show_error('OMDB_API_KEY is not configured. Please add it to the .env file.', 500);
			return;
		}

		$data['api_key'] = $apiKey;
		$this->load->view('movie_search', $data);
	}
}
