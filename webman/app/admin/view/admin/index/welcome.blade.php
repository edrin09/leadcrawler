@include('admin.layout.head')
<div class="layui-layout layui-padding-2">
    <div class="layui-layout-admin">
        <div class="layui-row layui-col-space10">
            <div class="layui-row layui-col-space10">
                    <div class="layui-col-md6 ">
                        <div class="layui-card">
                            <div class="layui-card-header"><i class="fa fa-warning icon"></i>数据统计</div>
                            <div class="layui-card-body">
                                <div class="welcome-module">
                                    <div class="layui-row layui-col-space10">
                                        <div class="layui-col-xs6">
                                            <div class="layui-panel">
                                                <div class="layui-card-body">
                                                    <span class="layui-badge layui-bg-cyan pull-right ">实时</span>
                                                    <div class="panel-content">
                                                        <h5>用户统计</h5>
                                                        <h1>1234</h1>
                                                        <h6>当前分类总记录数</h6>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="layui-col-xs6">
                                            <div class="layui-panel">
                                                <div class="layui-card-body">
                                                    <span class="layui-badge layui-bg-purple pull-right ">实时</span>
                                                    <div class="panel-content">
                                                        <h5>商品统计</h5>
                                                        <h1>1234</h1>
                                                        <h6>当前分类总记录数</h6>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="layui-col-xs6">
                                            <div class="layui-panel">
                                                <div class="layui-card-body ">
                                                    <span class="layui-badge layui-bg-orange pull-right ">实时</span>
                                                    <div class="panel-content">
                                                        <h5>浏览统计</h5>
                                                        <h1>1234</h1>
                                                        <h6>当前分类总记录数</h6>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="layui-col-xs6">
                                            <div class="layui-panel">
                                                <div class="layui-card-body ">
                                                    <span class="layui-badge layui-bg-red pull-right ">实时</span>
                                                    <div class="panel-content">
                                                        <h5>订单统计</h5>
                                                        <h1>1234</h1>
                                                        <h6>当前分类总记录数</h6>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="layui-col-md12 ">
                        <div class="layui-card">
                            <div class="layui-card-header"><i class="fa fa-line-chart icon"></i>报表统计</div>
                            <div class="layui-card-body">
                                <div id="echarts-records" style="width: 100%;min-height:500px"></div>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
    </div>
</div>
@include('admin.layout.foot')
