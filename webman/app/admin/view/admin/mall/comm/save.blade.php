@include('admin.layout.head')
<div class="layuimini-container">
    <form id="app-form" class="layui-form layuimini-form">
        <input type="hidden" name="cid" value="{{$data['cid']}}">
        @foreach ($main_list as $v)
            @if (in_array($v['input_type'], ['audio','video','image','file','atlas','media']))
                <div class="layui-form-item">
                    <label class="layui-form-label required">{{$v['input_remarks']}}</label>
                    <div class="layui-input-block layuimini-upload">
                        <input name="{{$v['input_title']}}" class="layui-input layui-col-xs6" lay-verify="required" placeholder="请上传{{$v['input_remarks']}}" value="{{$v['value']??''}}">
                        <div class="layuimini-upload-btn">
                            <span><a class="layui-btn" data-upload="{{$v['input_title']}}" data-upload-number="{{$v['uploads_type']}}" data-upload-exts="{{$v['uploads_exts']}}" data-upload-icon="{{$v['uploads_icon']}}"><i class="fa fa-upload"></i> 上传</a></span>
                        </div>
                    </div>
                </div>
            @endif

            @if ($v['input_type'] =='text')
                <div class="layui-form-item">
                    <label class="layui-form-label @if ($v['required'] ==1) required @endif">{{$v['input_remarks']}}</label>
                    <div class="layui-input-block">
                        <input class="layui-input"
                               @if ($v['required'] ==1)
                                   lay-verify="required"
                                   lay-reqtext="请输入{{$v['input_remarks']}}"
                               @endif
                               name="{{$v['input_title']}}"
                               type="text"
                               value="{{$v['value']??''}}">
                    </div>
                </div>
            @endif

            @if ($v['input_type'] =='textarea')
                    <div class="layui-form-item">
                        <label class="layui-form-label @if ($v['required'] ==1) required @endif">{{$v['input_remarks']}}</label>
                        <div class="layui-input-block">
                            <textarea class="layui-textarea"
                                  @if ($v['required'] ==1)
                                    lay-verify="required"
                                    lay-reqtext="请输入{{$v['input_remarks']}}"
                                  @endif
                                  name="{{$v['input_title']}}">{{$v['value']}}</textarea>
                        </div>
                    </div>
            @endif

            @if ($v['input_type'] =='editor')
                <div class="layui-form-item">
                    <label class="layui-form-label @if ($v['required'] ==1) required @endif">{{$v['input_remarks']}}</label>
                    <div class="layui-input-block">
                        @if(isset($v['value']))
                            {!!editor_textarea($v["value"],$v["input_title"],'请输入'.$v["input_remarks"]) !!}
                        @else
                            {!!editor_textarea('',$v["input_title"],'请输入'.$v["input_remarks"]) !!}
                        @endif
                    </div>
                </div>
            @endif

            @if ($v['input_type'] =='radio')
                <div class="layui-form-item">
                    <label class="layui-form-label required">{{$v['input_remarks']}}</label>
                        <div class="layui-input-block">
                            <select name="{{$v['input_title']}}" id="{{$v['input_title']}}" lay-verify="required" lay-reqtext="请选择{{$v['input_remarks']}}">
                                <option value="">选择{{$v['input_remarks']}}</option>

                                @if ($v['selected_array'])
                                    @foreach($v['selected_array'] as $key=>$vo)
                                        <option value="{{$vo['id']}}" @if(isset($v['value']) && $vo['id'] == $v['value']) selected @endif >
                                        {{$vo['title']}}
                                        </option>
                                    @endforeach
                                @else
                                    <option value="">-- 暂无数据 --</option>
                                @endif
                            </select>
                        </div>
                </div>
            @endif

        @endforeach

        <div class="hr-line"></div>
        <div class="layui-form-item text-center">
            <button type="submit" class="layui-btn layui-btn-normal layui-btn-sm" lay-submit>确认</button>
            <button type="reset" class="layui-btn layui-btn-primary layui-btn-sm">重置</button>
        </div>
    </form>
</div>

<!-- Loading遮罩层 -->
<div id="upload-loading">
    <div class="layui-layer-content" style="text-align: center; padding: 30px;">
        <div class="layui-icon layui-icon-loading layui-anim layui-anim-rotate layui-anim-loop" style="font-size: 30px; color: #1E9FFF;"></div>
        <div style="margin-top: 10px; font-size: 16px;">文件上传中，请稍候...</div>
    </div>
</div>
<script>
    let pk = "{{$data['pk']}}";
    let cid = "{{$data['cid']}}";
    let auth_header = "{{$data['auth_header']}}";
</script>

<style>
    /* 全局遮罩样式 */
    #upload-loading {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(202, 202, 202, 0.7);
        z-index: 9999;
        justify-content: center;
        align-items: center;
        flex-direction: column;
    }
</style>

@include('admin.layout.foot')