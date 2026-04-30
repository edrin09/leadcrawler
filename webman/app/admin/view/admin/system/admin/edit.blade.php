@include('admin.layout.head')
<div class="layuimini-container">
    <form id="app-form" class="layui-form layuimini-form">
        <div class="layui-form-item">
            <label class="layui-form-label required">登录账户</label>
            <div class="layui-input-block">
                <input type="text" name="username" class="layui-input" readonly value="{{$row['username']??''}}">
            </div>
        </div>

        <div class="layui-form-item">
            <label class="layui-form-label">角色权限</label>
            <div class="layui-input-block">
                <select name="auth_ids" lay-verify="required" lay-reqtext="请选择角色权限">
                    <option value="">选择角色权限</option>
                    @foreach($auth_list as $key=>$vo)
                        <option value="{{$vo['id']}}" @if($vo['id'] == $row['auth_ids']) selected @endif >
                            {{$vo['title']}}
                        </option>
                    @endforeach
                </select>
            </div>
        </div>

        <div class="layui-form-item layui-form-text">
            <label class="layui-form-label">备注信息</label>
            <div class="layui-input-block">
                <textarea name="remark" class="layui-textarea"
                          placeholder="请输入备注信息">{{$row['remark']??''}}</textarea>
            </div>
        </div>

        <div class="hr-line"></div>
        <div class="layui-form-item text-center">
            <button type="submit" class="layui-btn layui-btn-normal layui-btn-sm" lay-submit>确认</button>
            <button type="reset" class="layui-btn layui-btn-primary layui-btn-sm">重置</button>
        </div>

    </form>
</div>
@include('admin.layout.foot')