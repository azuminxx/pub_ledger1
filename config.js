/**
 * 🏢 統合台帳システム v2 - 設定ファイル
 * @description シンプル化された設定・定数管理
 * @version 2.0.0
 */
(function() {
    'use strict';

    // グローバル名前空間の初期化
    window.LedgerV2 = window.LedgerV2 || {};

    // =============================================================================
    // 📚 アプリケーション設定
    // =============================================================================

    // アプリケーションID設定
    const APP_IDS = {
        SEAT: 8,       // 座席台帳アプリ
        PC: 6,         // PC台帳アプリ
        EXT: 7,        // 内線台帳アプリ
        USER: 13       // ユーザー台帳アプリ
    };

    // アプリURLマッピング
    const APP_URL_MAPPINGS = {
        'seat_record_id': `/k/${APP_IDS.SEAT}/`,
        'pc_record_id': `/k/${APP_IDS.PC}/`,
        'ext_record_id': `/k/${APP_IDS.EXT}/`,
        'user_record_id': `/k/${APP_IDS.USER}/`
    };

    // =============================================================================
    // 🎯 定数定義
    // =============================================================================

    // =============================================================================
    // 📝 フィールド設定で使用可能な値一覧（参考用）
    // =============================================================================
    
    // cellType: 'text', 'input', 'dropdown', 'row_number', 'modification_checkbox', 'hide_button'
    // updateMode: 'static', 'dynamic'
    // category: '共通', '座席台帳', 'PC台帳', '内線台帳', 'ユーザー台帳'
    // filterType: 'text', 'dropdown'
    // searchOperator: '=', 'like', 'in'
    // searchValueFormatter: 'exact', 'prefix', 'list'
    // editableFrom: 'all', 'static'

    // =============================================================================
    // 📋 フィールド設定（シンプル化版）
    // =============================================================================

    const fieldsConfig = [
        // 行番号
        {
            fieldCode: '_row_number',
            label: '🔢',
            width: '20px',
            cellType: 'row_number',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            isRowNumber: true,
            showInModalPreview: false
        },

        // 変更チェックボックス
        {
            fieldCode: '_modification_checkbox',
            label: '✅',
            width: '30px',
            cellType: 'modification_checkbox',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            isModificationCheckbox: true,
            showInModalPreview: false
        },

        // 非表示ボタン
        {
            fieldCode: '_hide_button',
            label: '👁️‍🗨️',
            width: '30px',
            cellType: 'hide_button',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            isHideButton: true,
            showInModalPreview: false
        },

        // PC台帳フィールド
        {
            fieldCode: 'pc_record_id',
            label: '💻 PC-ID',
            width: '1px',
            cellType: 'text',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: '=',
            searchValueFormatter: 'exact',
            editableFrom: 'static',
            isRecordId: true,
            sourceApp: 'PC',
            showInModalPreview: false,
            isHiddenFromUser: true
        },
        {
            fieldCode: 'PC番号',
            label: '💻 PC番号',
            width: '150px',
            cellType: 'text',
            updateMode: 'static',
            category: 'PC台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            sourceApp: 'PC',
            isPrimaryKey: true,
            allowCellDragDrop: true,
            showInModalPreview: true
        },
        {
            fieldCode: 'PC用途',
            label: '🎯 PC用途',
            width: '100px',
            cellType: 'dropdown',
            updateMode: 'dynamic',
            category: 'PC台帳',
            options: [
                { value: '個人専用', label: '個人専用' },
                { value: 'CO/TOブース', label: 'CO/TOブース' },
                { value: 'RPA用', label: 'RPA用' },
                { value: '拠点設備用', label: '拠点設備用' },
                { value: '会議用', label: '会議用' },
                { value: '在庫', label: '在庫' }
            ],
            filterType: 'dropdown',
            searchOperator: 'in',
            searchValueFormatter: 'list',
            editableFrom: 'all',
            sourceApp: 'PC',
            showInModalPreview: true
        },

        // ユーザー台帳フィールド
        {
            fieldCode: 'user_record_id',
            label: '👥 USER-ID',
            width: '1px',
            cellType: 'text',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: '=',
            searchValueFormatter: 'exact',
            editableFrom: 'static',
            isRecordId: true,
            sourceApp: 'USER',
            showInModalPreview: false,
            isHiddenFromUser: true
        },
        {
            fieldCode: 'ユーザーID',
            label: '🆔 ユーザーID',
            width: '100px',
            cellType: 'text',
            updateMode: 'static',
            category: 'ユーザー台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            sourceApp: 'USER',
            isPrimaryKey: true,
            allowCellDragDrop: true,
            showInModalPreview: true
        },
        {
            fieldCode: 'ユーザー名',
            label: '👤 ユーザー名',
            width: '100px',
            cellType: 'input',
            updateMode: 'dynamic',
            category: 'ユーザー台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'all',
            sourceApp: 'USER',
            showInModalPreview: true
        },

        // 内線台帳フィールド
        {
            fieldCode: 'ext_record_id',
            label: '☎️ 内線ID',
            width: '1px',
            cellType: 'text',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: '=',
            searchValueFormatter: 'exact',
            editableFrom: 'static',
            isRecordId: true,
            sourceApp: 'EXT',
            showInModalPreview: false,
            isHiddenFromUser: true
        },
        {
            fieldCode: '内線番号',
            label: '☎️ 内線番号',
            width: '90px',
            cellType: 'text',
            updateMode: 'static',
            category: '内線台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            sourceApp: 'EXT',
            isPrimaryKey: true,
            allowCellDragDrop: true,
            showInModalPreview: true
        },
        {
            fieldCode: '電話機種別',
            label: '📱 電話機種別',
            width: '80px',
            cellType: 'dropdown',
            updateMode: 'dynamic',
            category: '内線台帳',
            options: [
                { value: 'ビジネス', label: 'ビジネス' },
                { value: 'ACD', label: 'ACD' }
            ],
            filterType: 'dropdown',
            searchOperator: 'in',
            searchValueFormatter: 'list',
            editableFrom: 'all',
            sourceApp: 'EXT',
            showInModalPreview: true
        },

        // 座席台帳フィールド
        {
            fieldCode: 'seat_record_id',
            label: '🪑 座席ID',
            width: '1px',
            cellType: 'text',
            updateMode: 'static',
            category: '共通',
            filterType: 'text',
            searchOperator: '=',
            searchValueFormatter: 'exact',
            editableFrom: 'static',
            isRecordId: true,
            sourceApp: 'SEAT',
            showInModalPreview: false,
            isHiddenFromUser: true
        },
        {
            fieldCode: '座席番号',
            label: '🪑 座席番号',
            width: '130px',
            cellType: 'text',
            updateMode: 'static',
            category: '座席台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'static',
            sourceApp: 'SEAT',
            isPrimaryKey: true,
            allowCellDragDrop: true,
            showInModalPreview: true
        },
        {
            fieldCode: '座席拠点',
            label: '📍 座席拠点',
            width: '80px',
            cellType: 'dropdown',
            updateMode: 'dynamic',
            category: '座席台帳',
            options: [
                { value: '池袋', label: '池袋' },
                { value: '埼玉', label: '埼玉' },
                { value: '文京', label: '文京' },
                { value: '浦和', label: '浦和' }
            ],
            filterType: 'dropdown',
            searchOperator: 'in',
            searchValueFormatter: 'list',
            editableFrom: 'all',
            sourceApp: 'SEAT',
            showInModalPreview: true
        },
        {
            fieldCode: '階数',
            label: '🔢 階数',
            width: '70px',
            cellType: 'input',
            updateMode: 'dynamic',
            category: '座席台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'all',
            sourceApp: 'SEAT',
            allowFillHandle: true,
            showInModalPreview: true
        },
        {
            fieldCode: '座席部署',
            label: '🏢 座席部署',
            width: '70px',
            cellType: 'input',
            updateMode: 'dynamic',
            category: '座席台帳',
            filterType: 'text',
            searchOperator: 'like',
            searchValueFormatter: 'prefix',
            editableFrom: 'all',
            sourceApp: 'SEAT',
            showInModalPreview: true
        },
    ];

    // =============================================================================
    // 📏 UI設定（シンプル版）
    // =============================================================================

    const UI_SETTINGS = {
        FONT_SIZE: '11px',
        CELL_PADDING: '1px',
        BORDER_COLOR: '#ccc',
        HIGHLIGHT_COLOR: '#fff3e0',
        MODIFIED_COLOR: '#ffeb3b'
    };

    // =============================================================================
    // 🌐 グローバル公開
    // =============================================================================

    // 設定をグローバルスコープに公開
    window.LedgerV2.Config = {
        APP_IDS,
        APP_URL_MAPPINGS,
        fieldsConfig,
        UI_SETTINGS
    };

    // レガシー互換性のため一部をwindowに直接公開
    window.APP_IDS = APP_IDS;
    window.fieldsConfig = fieldsConfig;

    console.log('✅ LedgerV2 設定システム初期化完了');

})();
