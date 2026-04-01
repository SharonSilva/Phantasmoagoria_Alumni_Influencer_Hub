<?php

class Coursework{
    public $mark;

    public function __construct($mark)
    {
        $this->mark=$mark;
    }

    public function calc_weight($weightage)
    {
        return $this->mark*$weightage;
    }
}