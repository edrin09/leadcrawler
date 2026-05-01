<?php


namespace app\admin\controller\comm;

use app\admin\traits\MaillCurd;
use Exception;

class MallComm extends CommController
{
    use MaillCurd;

    protected $business;
    protected $business_type;

    protected $selected_arr = [];
    protected $data_brage = [];
    protected $cid;
    protected $auth_header;

    protected $with_join = [];
    protected $join_type = 'INNER';

    public function initialize()
    {
        parent::initialize();
        if (!isset($this->model)) {
            throw new Exception('Model must be initialized in child class');
        }

        $this->cid = input('cid', '');
        $this->sort = input('sort', 'desc');
        $this->business_type = input('business_type', '');
        $this->pk = $this->model->getPk();
        $this->auth_header = 'mall/' . $this->business;

        $data['cid'] = $this->cid;
        $data['pk'] = $this->pk;
        $data['business_type'] = $this->business_type;
        $data['auth_header'] = $this->auth_header;

        $this->assign(compact('data'));

        //权限控制渲染
        $auth['auth_add'] = auths($this->auth_header . '/add');
        $auth['auth_edit'] = auths($this->auth_header . '/edit');
        $auth['auth_del'] = auths($this->auth_header . '/delete');
        $auth['auth_export'] = auths($this->auth_header . '/export');
        $auth['auth_import'] = auths($this->auth_header . '/import');
        $auth['auth_item'] = true;
        $auth['auth_info'] = true;


//        pre($auth, 'auth', false, true);
        $this->assign(compact('auth'));
    }
}