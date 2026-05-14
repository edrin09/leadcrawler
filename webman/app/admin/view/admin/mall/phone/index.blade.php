@include('admin.layout.head')
<div class="layuimini-container">
    <div class="layuimini-main">
        <table id="currentTable" class="layui-table layui-hide"
               data-auth-add="{{auths('business/phoneExtractor/add')}}"
               data-auth-delete="{{auths('business/phoneExtractor/delete')}}"
               lay-filter="currentTable">
        </table>
    </div>
</div>
@include('admin.layout.foot')