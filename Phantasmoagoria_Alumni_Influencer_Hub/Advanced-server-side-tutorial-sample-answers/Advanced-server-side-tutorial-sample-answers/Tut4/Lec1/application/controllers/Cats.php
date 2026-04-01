<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Cats extends CI_Controller {

	const MAX_REMEMBERED = 3;

	public function __construct() {
		parent::__construct();
		$this->load->model('Catmodel');
	}

	public function index() {
		$cat = $this->Catmodel->getRandom();
		
		$session_cats = $this->Catmodel->loadSession($this->session->session_id);
		if (!is_array($session_cats)) $session_cats = array();
		$session_cats = array_reverse($session_cats); // newest first for display
		$lastviewed_cats = $this->Catmodel->getcats($session_cats);
		$this->load->view('cat_view', array('cat' => $cat, 'viewed_cats' => $lastviewed_cats));
	}

	/**
	 * Vote: looks at URL segments for votetype (upvote/downvote) and cat id.
	 * Redirect back to index so we redisplay main page with (a) new cat.
	 * redirect() is from CodeIgniter URL helper.
	 */
	public function vote() {
		$votetype = $this->uri->segment(3);
		$catid    = (int) $this->uri->segment(4);
		if ($votetype === 'upvote') {
			$this->Catmodel->addLike($catid);
			$this->remembercat($catid);
		} elseif ($votetype === 'downvote') {
			$this->Catmodel->addDislike($catid);
		}
		redirect(site_url('Cats'));
	}

	public function topliked() {
		$this->db->order_by('like_count', 'DESC');
		$data['cats'] = $this->db->get('cats')->result();
		$this->load->view('topliked_view', $data);
	}

	/**
	 * Remember a cat in session; keep only last 3 (slide: append, then shift if > 3).
	 */
	public function remembercat($catid) {
		$remembered_cats = $this->Catmodel->loadSession($this->session->session_id);
		if (!is_array($remembered_cats)) $remembered_cats = array();
		$remembered_cats[] = $catid;
		if (count($remembered_cats) > self::MAX_REMEMBERED) {
			array_shift($remembered_cats);
		}
		$this->Catmodel->storeSession($this->session->session_id, $catid);
	}

}
