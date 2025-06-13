<<<<<<< HEAD
/**
 * 統合台帳システム v2 - テーブル機能統合管理 (table-integration.js)
 * @description 分割されたテーブル機能ファイルの統合管理・初期化制御
 * @version 2.0.0
 * 
 * 🎯 **ファイルの責任範囲**
 * ✅ 分割ファイルの読み込み順序制御
 * ✅ モジュール依存関係チェック
 * ✅ グローバルインスタンス作成（レガシー互換性）
 * ✅ 初期化タイミング制御
 * 
 * ❌ **やってはいけないこと（責任範囲外）**
 * ❌ 具体的な機能実装（各専用ファイルの責任）
 * ❌ ビジネスロジック
 * ❌ DOM操作・UI処理
 * 
 * 📋 **管理対象ファイル**
 * - table-render.js: テーブル描画 ✅
 * - table-interact.js: ユーザー操作 ✅
 * - table-header.js: 初期化・ヘッダー ✅
 * - table-pagination.js: ページネーション ✅
 * 
 * 🔗 **依存関係チェック**
 * - LedgerV2.TableRender.TableDisplayManager ✅
 * - LedgerV2.TableInteract.TableEventManager ✅
 * - LedgerV2.TableHeader.TableCreator ✅
 * - LedgerV2.Pagination.PaginationManager ✅
 * 
 * 💡 **責任**
 * - 統合管理のみ、機能実装は各専用ファイルに委譲
 */
(function() {
    'use strict';

    // 分割されたファイルが読み込まれていることを確認
    function waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5秒後にタイムアウト

            const checkModules = () => {
                attempts++;
                
                // 各モジュールの読み込み状況をチェック
                const hasTableRender = !!window.LedgerV2?.TableRender?.TableDisplayManager;
                const hasTableInteract = !!window.LedgerV2?.TableInteract?.TableEventManager;
                const hasTableHeader = !!window.LedgerV2?.TableHeader?.TableCreator;
                const hasPagination = !!window.LedgerV2?.Pagination?.PaginationManager;

                if (hasTableRender && hasTableInteract && hasTableHeader && hasPagination) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ 依存関係読み込みタイムアウト - 利用可能なモジュールで続行');
                    resolve();
                } else {
                    setTimeout(checkModules, 100);
                }
            };
            checkModules();
        });
    }

    // レガシー互換性確保とグローバルインスタンス作成
    async function initializeTableIntegration() {
        // 座席表ページかどうかをチェック
        if (document.getElementById('seat-map-canvas')) {
            console.log('ℹ️ 座席表ページのため、テーブル統合初期化をスキップします');
            return;
        }

        // 必要なテーブル要素の存在チェック
        if (!document.getElementById('my-table') || !document.getElementById('my-thead') || !document.getElementById('my-tbody')) {
            console.log('ℹ️ 統合台帳テーブル要素が見つからないため、テーブル統合初期化をスキップします');
            return;
        }

        await waitForModules();

        // グローバルインスタンス作成（レガシー互換性）
        window.paginationManager = new window.PaginationManager();
        window.paginationUI = new window.PaginationUIManager(window.paginationManager);

        // HTMLで既にテーブルが定義されているので、ヘッダー初期化のみ実行
        if (window.LedgerV2?.TableHeader?.TableCreator) {
            try {
                await window.LedgerV2.TableHeader.TableCreator.createTable();
            } catch (error) {
                console.error('❌ テーブル初期化エラー:', error);
            }
        }
    }

    // 初期化実行 - DOMContentLoadedまたはloadイベント後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTableIntegration);
    } else {
        // DOMが既に読み込まれている場合は即座に実行
        initializeTableIntegration();
    }

=======
/**
 * 統合台帳システム v2 - テーブル機能統合管理 (table-integration.js)
 * @description 分割されたテーブル機能ファイルの統合管理・初期化制御
 * @version 2.0.0
 * 
 * 🎯 **ファイルの責任範囲**
 * ✅ 分割ファイルの読み込み順序制御
 * ✅ モジュール依存関係チェック
 * ✅ グローバルインスタンス作成（レガシー互換性）
 * ✅ 初期化タイミング制御
 * 
 * ❌ **やってはいけないこと（責任範囲外）**
 * ❌ 具体的な機能実装（各専用ファイルの責任）
 * ❌ ビジネスロジック
 * ❌ DOM操作・UI処理
 * 
 * 📋 **管理対象ファイル**
 * - table-render.js: テーブル描画 ✅
 * - table-interact.js: ユーザー操作 ✅
 * - table-header.js: 初期化・ヘッダー ✅
 * - table-pagination.js: ページネーション ✅
 * 
 * 🔗 **依存関係チェック**
 * - LedgerV2.TableRender.TableDisplayManager ✅
 * - LedgerV2.TableInteract.TableEventManager ✅
 * - LedgerV2.TableHeader.TableCreator ✅
 * - LedgerV2.Pagination.PaginationManager ✅
 * 
 * 💡 **責任**
 * - 統合管理のみ、機能実装は各専用ファイルに委譲
 */
(function() {
    'use strict';

    // 分割されたファイルが読み込まれていることを確認
    function waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5秒後にタイムアウト

            const checkModules = () => {
                attempts++;
                
                // 各モジュールの読み込み状況をチェック
                const hasTableRender = !!window.LedgerV2?.TableRender?.TableDisplayManager;
                const hasTableInteract = !!window.LedgerV2?.TableInteract?.TableEventManager;
                const hasTableHeader = !!window.LedgerV2?.TableHeader?.TableCreator;
                const hasPagination = !!window.LedgerV2?.Pagination?.PaginationManager;

                if (hasTableRender && hasTableInteract && hasTableHeader && hasPagination) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ 依存関係読み込みタイムアウト - 利用可能なモジュールで続行');
                    resolve();
                } else {
                    setTimeout(checkModules, 100);
                }
            };
            checkModules();
        });
    }

    // レガシー互換性確保とグローバルインスタンス作成
    async function initializeTableIntegration() {
        await waitForModules();

        // グローバルインスタンス作成（レガシー互換性）
        window.paginationManager = new window.PaginationManager();
        window.paginationUI = new window.PaginationUIManager(window.paginationManager);

        // HTMLで既にテーブルが定義されているので、ヘッダー初期化のみ実行
        if (window.LedgerV2?.TableHeader?.TableCreator) {
            try {
                await window.LedgerV2.TableHeader.TableCreator.createTable();
            } catch (error) {
                console.error('❌ テーブル初期化エラー:', error);
            }
        }
    }

    // 初期化実行 - DOMContentLoadedまたはloadイベント後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTableIntegration);
    } else {
        // DOMが既に読み込まれている場合は即座に実行
        initializeTableIntegration();
    }

>>>>>>> ada358dba440c599f577d9ac6a38bce261eb2264
})(); 