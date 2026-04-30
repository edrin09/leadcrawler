define(["jquery", "easy-admin"], function ($, ea) {

    var init = {
        pk: pk,//主键ID   修改表的主键ID   https://toscode.gitee.com/zhongshaofa/easyadmin/issues/I22CXB
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: auth_header + '/index',
        add_url: auth_header + '/add',
        edit_url: auth_header + '/edit',
        delete_url: auth_header + '/delete',
        modify_url: auth_header + '/modify',
        export_url: auth_header + '/export',
    };

    var Controller = {

        index: function () {
            ea.table.render({
                init: init,
                where: ea.getUrlParams(['customer_id']),
                cols: [[
                    {
                        field: 'nickname',
                        minWidth: 80,
                        title: '客户昵称'
                    },
                    {
                        field: 'avatar',
                        minWidth: 80,
                        title: '头像',
                        search: false,
                        templet: ea.table.image
                    },
                    {
                        field: 'create_time',
                        minWidth: 80,
                        title: '创建时间',
                        search: 'range',
                        sort: true
                    },
                    {
                        width: 250,
                        title: '操作',
                        templet: ea.table.tool,
                        fixed: 'right',
                        operat: ['edit', 'delete']
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
        commission: function () {
            ea.listen();
        },
    };
    return Controller;
});
