@include('admin.layout.head')
<div class="layui-fluid">
    <div class="layui-card">
        <div class="layui-card-header">
            <h3>添加电话号码</h3>
        </div>
        <div class="layui-card-body">
            <form class="layui-form" action="/admin/business/phoneExtractor/add" method="post">
                <div class="layui-form-item">
                    <label class="layui-form-label">电话号码</label>
                    <div class="layui-input-block">
                        <input type="text" name="phone" placeholder="请输入11位手机号码" class="layui-input" lay-verify="required|phone" maxlength="11">
                        <div class="layui-form-mid layui-word-aux">
                            请输入正确的11位手机号码，例如：13800138000
                        </div>
                    </div>
                </div>
                <div class="layui-form-item">
                    <div class="layui-input-block">
                        <button class="layui-btn" lay-submit lay-filter="submit">保存</button>
                        <a href="/admin/business/phoneExtractor/index" class="layui-btn layui-btn-primary">取消</a>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
@include('admin.layout.foot')