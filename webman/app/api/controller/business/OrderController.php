<?php

namespace app\api\controller\business;

use app\api\service\business\OrderService;
use app\common\model\business\MallOrder;

class OrderController extends ApiMallComm
{
    public function initialize()
    {
        parent::initialize();
    }

    /**
     * 创建订单
     */
    public function createOrder()
    {
        $rule['service_type_id'] = 'require|integer';
//        $rule['department_id'] = 'require|integer';
        $rule['patient_name'] = 'require|string';
        $rule['patient_age'] = 'require|integer';
        $rule['hospital_id'] = 'require|integer';
        $rule['doctor_name'] = 'string';
        $rule['service_time'] = 'dateFormat:Y-m-d H:i:s';
        $rule['disease_desc'] = 'require|string';
        $rule['service_requirement'] = 'string';
        $rule['files'] = 'require|array';
        $this->validate($this->param, $rule);

        // 创建订单
        $orderService = new OrderService($this->param, $this->user_info);
        $order = $orderService->createOrder();

        return $this->render_success($order);
    }

    /**
     * 订单列表
     */
    public function getOrderList()
    {
        $rule['status'] = 'require|integer';
        $this->validate($this->param, $rule);

        $orderService = new OrderService($this->param, $this->user_info);
        $order = $orderService->getOrderList();

        return $this->render_success($order);
    }

    /**
     * 订单详情
     */
    public function getOrderInfo()
    {
        $rule['order_id'] = 'require|integer';
        $this->validate($this->param, $rule);

        $orderService = new OrderService($this->param, $this->user_info);
        $order = $orderService->getOrderInfo();

        return $this->render_success($order);
    }

    /**
     * 取消订单
     */
    public function cancelOrder()
    {
        $rule['order_id'] = 'require|integer';
        $this->validate($this->param, $rule);

        $orderService = new OrderService($this->param, $this->user_info);
        $order = $orderService->cancelOrder();

        return $this->render_success($order);
    }

    /**
     * 上传就诊码
     */
    public function uploadCode()
    {
        $rule['order_id'] = 'require|integer';
        $rule['visit_code'] = 'require';
        $this->validate($this->param, $rule);

        $orderService = new OrderService($this->param, $this->user_info);
        $order = $orderService->uploadCode();

        return $this->render_success($order);
    }

    /**
     * 申请退款
     */
    public function refundOrder()
    {
        $rule['order_id'] = 'require|integer';
        $this->validate($this->param, $rule);

        $orderService = new OrderService($this->param, $this->user_info);
        $order = $orderService->refundOrder();

        return $this->render_success($order);
    }
}