define(["jquery", "easy-admin"], function ($, ea) {

    var init = {
        table_elem: '#currentTable',
        table_render_id: 'currentTableRenderId',
        index_url: 'system/cronjob/index',
        add_url: 'system/cronjob/add',
        edit_url: 'system/cronjob/edit',
        modify_url: 'system/cronjob/modify',
        delete_url: 'system/cronjob/delete',
        cronlogs_url: 'system/cronjob/cronlogs',
        run_url: 'system/cronjob/run',
    };

    var Controller = {

        index: function () {

            ea.table.render({
                init: init,
                cols: [[
                    {
                        field: 'name',
                        minWidth: 120,
                        title: '任务名称'
                    },
                    {
                        field: 'command',
                        minWidth: 150,
                        title: '执行命令'
                    },
                    {
                        field: 'expression',
                        minWidth: 120,
                        title: 'Cron表达式',
                        search: false,
                    },
                    {
                        field: 'type',
                        title: '任务类型',
                        width: 100,
                        search: 'select',
                        selectList: {1: '系统', 2: '应用', 3: '自定义'},
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
                        field: 'next_run_time',
                        minWidth: 120,
                        title: '下次执行时间',
                        search: 'range'
                    },
                    {
                        field: 'create_time',
                        minWidth: 120,
                        title: '创建时间',
                        search: 'range',
                    },
                    {
                        width: 300,
                        title: '操作',
                        templet: ea.table.tool,
                        operat: [
                            'edit',
                            [{
                                text: '执行日志',
                                url: init.cronlogs_url,
                                method: 'open',
                                auth: 'logs',
                                class: 'layui-btn layui-btn-normal layui-btn-xs',
                            }],
                            [{
                                text: '立即执行',
                                url: init.run_url,
                                method: 'request',
                                auth: 'run',
                                class: 'layui-btn layui-btn-success layui-btn-danger layui-btn-xs',
                            }],
                            'delete'
                        ]
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
        cronlogs: function () {
            var logsInit = {
                table_elem: '#currentTable',
                table_render_id: 'currentTableRenderId',
                index_url: 'system/cronjob/cronlogs',
            };

            ea.table.render({
                init: logsInit,
                cols: [[
                    {
                        field: 'start_time',
                        minWidth: 150,
                        title: '开始时间',
                        search: false
                    },
                    {
                        field: 'end_time',
                        minWidth: 150,
                        title: '结束时间',
                        search: false
                    },
                    {
                        field: 'duration',
                        width: 120,
                        title: '执行时长(秒)',
                        search: false
                    },
                    {
                        field: 'status',
                        title: '状态',
                        width: 85,
                        search: 'select',
                        selectList: {0: '失败', 1: '成功'},
                        templet: function (d) {
                            return d.status == 1 ? '<span class="layui-badge layui-bg-green">成功</span>' : '<span class="layui-badge layui-bg-red">失败</span>';
                        }
                    },
                    {
                        field: 'output',
                        minWidth: 120,
                        title: '终端输出',
                        search: false
                    },
                    {
                        field: 'error',
                        minWidth: 150,
                        title: '错误信息',
                        search: false
                    }
                ]],
            });

            ea.listen();
        }
    };

    return Controller;
});
