define(["jquery", "easy-admin"], function ($, ea) {

    var init = {
        pk: pk,//主键ID   修改表的主键ID   https://toscode.gitee.com/zhongshaofa/easyadmin/issues/I22CXB
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: auth_header + '/index',
        add_url: auth_header + '/add',
        edit_url: auth_header + '/edit',
        delete_url: auth_header + '/invalid',
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
                        field: 'image_url',
                        width: 80,
                        title: '图片',
                        align: 'left',
                        templet: ea.table.image
                    },
                    {
                        field: 'create_time',
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
                            return '<a href="' + d.detail_url + '" target="_blank" rel="noopener noreferrer">' + d.title + '</a>';
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
                        field: 'phone_count',
                        width: 120,
                        title: '手机号数量',
                        align: 'left'
                    },
                    {
                        width: 200,
                        title: '操作',
                        align: 'left',
                        fixed: 'right',
                        templet: function (d) {
                            // 获取主键值
                            var pkValue = d[pk];
                            var html = '';

                            if (ea.checkPermission('edit', init.table_elem)) {

                                // 按钮始终显示 - 使用 href="javascript:;" 防止页面刷新
                                html += '<a href="javascript:;" ' +
                                    'class="layui-btn layui-btn-success layui-btn-xs" ' +
                                    'data-full="false" ' +
                                    'data-auth="edit" ' +
                                    'data-open="' + init.edit_url + '/id/' + pkValue + '" ' +
                                    'data-title="编辑">编辑</a> ';
                            }

                            if (ea.checkPermission('delete', init.table_elem)) {
                                html += '<a href="javascript:;" ' +
                                    'class="layui-btn layui-btn-danger layui-btn-xs"' +
                                    'data-full="false" ' +
                                    'data-auth="delete" ' +
                                    'data-request="' + init.delete_url + '?id=' + pkValue + '" ' +
                                    'data-title="确定删除?">删除</a> ';
                            }

                            html += '<a href="javascript:;" ' +
                                'class="layui-btn layui-btn-xs layui-btn-warm" ' +
                                'data-full="false" ' +
                                'data-auth="false" ' +
                                'data-open="mall/phone/index?mall_data_id=' + pkValue + '" ' +
                                'data-title="手机号列表">手机号列表</a> ';

                            return html;
                        }
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
