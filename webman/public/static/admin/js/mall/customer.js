define(["jquery", "easy-admin"], function ($, ea) {

    var init = {
        pk: pk,//主键ID   修改表的主键ID   https://toscode.gitee.com/zhongshaofa/easyadmin/issues/I22CXB
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: auth_header + '/index?cid=' + cid,
        add_url: auth_header + '/add?cid=' + cid,
        edit_url: auth_header + '/edit?cid=' + cid,
        delete_url: auth_header + '/delete?cid=' + cid,
        modify_url: auth_header + '/modify?cid=' + cid,
        export_url: auth_header + '/export?cid=' + cid,
    };

    var Controller = {

        index: function () {
            ea.table.render({
                init: init,
                where: ea.getUrlParams(['customer_id']),
                cols: [[
                    {
                        field: 'username',
                        minWidth: 80,
                        title: '用户名',
                        edit: true,
                    },
                    {
                        field: 'create_time',
                        minWidth: 80,
                        title: '创建时间',
                        search: 'range',
                        sort: true
                    },
                    {
                        field: 'status',
                        title: '状态',
                        width: 85,
                        search: 'select',
                        templet: ea.table.switch
                    },
                    {
                        field: 'expansion.login_num',
                        minWidth: 80,
                        title: '登录次数'
                    },
                    {
                        field: 'expansion.login_time',
                        minWidth: 80,
                        title: '最近登录时间'
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
    };
    return Controller;
});
