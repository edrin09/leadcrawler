@include('admin.layout.head')
<div class="layui-fluid">
    <div class="layui-card">
        <div class="layui-card-header">
            <h3>添加计划任务</h3>
        </div>
        <div class="layui-card-body">
            <form class="layui-form" action="/admin/system/cronjob/add" method="post">
                <div class="layui-form-item">
                    <label class="layui-form-label">任务名称</label>
                    <div class="layui-input-block">
                        <input type="text" name="name" placeholder="请输入任务名称" class="layui-input" lay-verify="required">
                    </div>
                </div>
                <div class="layui-form-item">
                    <label class="layui-form-label">任务类型</label>
                    <div class="layui-input-block">
                        <select name="type" lay-verify="required">
                            <option value="">请选择任务类型</option>
                            <option value="1">PHP脚本</option>
                            <option value="2">命令行</option>
                            <option value="3">HTTP请求</option>
                        </select>
                    </div>
                </div>
                <div class="layui-form-item">
                    <label class="layui-form-label">执行命令</label>
                    <div class="layui-input-block">
                        <textarea name="command" placeholder="请输入执行命令" class="layui-textarea" lay-verify="required"></textarea>
                        <div class="layui-form-mid layui-word-aux">
                            <p>PHP脚本：相对路径，例如：app/command/test.php</p>
                            <p>命令行：完整命令，例如：ls -la</p>
                            <p>HTTP请求：完整URL，例如：https://example.com/api</p>
                        </div>
                    </div>
                </div>
                <div class="layui-form-item">
                    <label class="layui-form-label">cron表达式</label>
                    <div class="layui-input-block">
                        <input type="text" name="expression" placeholder="请输入cron表达式" class="layui-input" lay-verify="required" value="0 * * * * *">
                        <div class="layui-form-mid layui-word-aux">
                            格式：秒 分 时 日 月 周，例如：0 * * * * * 表示每分钟执行一次
                        </div>
                    </div>
                </div>
                <div class="layui-form-item">
                    <label class="layui-form-label">状态</label>
                    <div class="layui-input-block">
                        <input type="checkbox" name="status" lay-skin="switch" lay-text="启用|禁用" checked>
                    </div>
                </div>
                <div class="layui-form-item">
                    <div class="layui-input-block">
                        <button class="layui-btn" lay-submit lay-filter="submit">保存</button>
                        <a href="/admin/system/cronjob" class="layui-btn layui-btn-primary">取消</a>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
@include('admin.layout.foot')