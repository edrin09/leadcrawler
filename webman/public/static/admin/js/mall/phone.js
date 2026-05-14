define(["jquery", "easy-admin"], function ($, ea) {

    var init = {
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: 'mall/phone/index',
        add_url: 'mall/phone/add',
        modify_url: 'mall/phone/modify',
        delete_url: 'mall/phone/delete',
    };

    var Controller = {

        index: function () {

            ea.table.render({
                init: init,
                toolbar: ['refresh', 'add', 'delete'],
                cols: [[
                    {
                        type: 'checkbox'
                    },
                    {
                        field: 'phone',
                        minWidth: 150,
                        title: '电话号码',
                        search: true,
                    },
                    {
                        field: 'data_id',
                        title: '来源ID',
                        width: 100,
                        search: false,
                    },
                    {
                        field: 'status',
                        title: '状态',
                        width: 85,
                        search: 'select',
                        selectList: {0: '已删除', 1: '正常'},
                        templet: ea.table.switch
                    },
                    {
                        field: 'create_time',
                        minWidth: 150,
                        title: '创建时间',
                        search: false,
                    },
                    {
                        width: 150,
                        title: '操作',
                        templet: ea.table.tool,
                        operat: [
                            'delete'
                        ]
                    }
                ]],
            });

            ea.listen();
        },
        add: function () {
            ea.listen();

            layui.form.verify({
                phone: function (value) {
                    if (!/^1[3-9]\d{9}$/.test(value)) {
                        return '请输入正确的11位手机号码';
                    }
                }
            });
        },
    };

    return Controller;
});