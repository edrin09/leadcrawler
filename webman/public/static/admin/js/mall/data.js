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
                    // {type: "checkbox"},
                    // {
                    //     field: 'id',
                    //     width: 80,
                    //     title: 'ID',
                    // },
                    {
                        field: 'source',
                        width: 80,
                        title: '来源',
                        align: 'left',
                        selectList: { '58': '58同城', 'anjuke': '安居客', 'goofish': '闲鱼' },
                        templet: ea.table.select
                    },
                    {
                        field: 'crawler_time',
                        width: 160,
                        title: '采集时间',
                        align: 'left',
                        search: 'range'
                    },
                    {
                        field: 'title',
                        minWidth: 600,
                        title: '标题',
                        align: 'left',
                        templet: function (d) {
                            return '<a href="' + d.detailUrl + '" target="_blank" rel="noopener noreferrer">' + d.title + '</a>';
                        }
                    },
                    // {
                    //     field: 'status',
                    //     title: '状态',
                    //     width: 85,
                    //     templet: ea.table.switch
                    // },
                    // {
                    //     field: 'detailUrl',
                    //     minWidth: 80,
                    //     title: '详情',
                    //     templet: function (d) {
                    //         return '<a href="' + d.detailUrl + '" target="_blank" rel="noopener noreferrer" class="layui-btn layui-btn-xs layui-btn-primary">查看详情</a>';
                    //     }
                    // },
                    {
                        width: 100,
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
