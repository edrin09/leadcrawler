define(["jquery", "easy-admin"], function ($, ea) {

    var init = {
        pk: pk,//主键ID   修改表的主键ID   https://toscode.gitee.com/zhongshaofa/easyadmin/issues/I22CXB
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: auth_header + '/index',
        add_url: auth_header + '/add',
        edit_url: auth_header + '/edit',
        delete_url: auth_header + '/delete',
        export_url: auth_header + '/export',
        modify_url: auth_header + '/modify',
    };

    var Controller = {

        index: function () {
            ea.table.render({
                init: init,
                cols: [[
                    {type: "checkbox"},
                    {
                        field: 'id',
                        width: 80,
                        title: 'ID',
                        searchOp: '='
                    },
                    {
                        field: 'sort',
                        width: 80,
                        title: '排序',
                        edit: 'text' +
                            ''
                    },
                    {
                        field: 'title',
                        minWidth: 80,
                        title: '分类名称'
                    },
                    {
                        field: 'image',
                        minWidth: 80,
                        title: '分类图片',
                        search: false,
                        templet: ea.table.image
                    },
                    {
                        field: 'remark',
                        minWidth: 80,
                        title: '备注信息'
                    },
                    {
                        field: 'status',
                        title: '状态',
                        width: 85,
                        search: 'select',
                        selectList: {0: '禁用', 1: '启用'},
                        templet: ea.table.switch
                    },
                    {
                        field: 'create_time',
                        minWidth: 80,
                        title: '创建时间',
                        search: 'range'
                    },
                    {
                        width: 250,
                        title: '操作',
                        templet: ea.table.tool,
                        fixed: 'right',
                        operat: [
                            [{
                                text: '编辑',
                                url: init.edit_url,
                                method: 'open',
                                auth: 'edit',
                                class: 'layui-btn layui-btn-xs layui-btn-success',
                            }],
                            'delete']
                    }
                ]],
            });

            ea.listen();
        },
        add: function () {
            ea.listen();
        },
        edit: function () {
            ea.listen();
        },
    };
    return Controller;
});
