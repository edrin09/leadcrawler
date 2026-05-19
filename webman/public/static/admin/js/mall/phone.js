define(["jquery", "easy-admin"], function ($, ea) {
    var mall_data_id = ea.getQueryVariable('mall_data_id');
    var init = {
        pk: pk,//主键ID   修改表的主键ID   https://toscode.gitee.com/zhongshaofa/easyadmin/issues/I22CXB
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: auth_header + '/index',
        add_url: auth_header + '/add',
        delete_url: auth_header + '/delete',
    };

    var Controller = {

        index: function () {
            ea.table.render({
                init: init,
                where: ea.getUrlParams(['mall_data_id']),

                cols: [[
                    {
                        field: 'phone',
                        width: 150,
                        title: '手机号',
                        align: 'left',
                        search: false
                    },
                    {
                        field: 'create_time',
                        width: 160,
                        title: '采集时间',
                        align: 'left',
                        search: false
                    },
                    {
                        width: 250,
                        title: '操作',
                        templet: ea.table.tool,
                        fixed: 'right',
                        operat: ['delete']
                    }
                ]],
            });

            ea.listen();
        },
        add: function () {
            ea.listen();
        },
    };
    return Controller;
});
