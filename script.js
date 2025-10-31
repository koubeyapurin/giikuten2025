// アプリの状態管理
class YurufuwaApp {
    constructor() {
        this.posts = [];
        this.postIdCounter = 0;
        this.maxVisiblePosts = 20; // 同時表示する最大投稿数
        this.currentRoom = this.getRoomFromURL(); // ルーム取得
        this.init();
    }

    // URLからルームIDを取得
    getRoomFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room') || 'default';
    }

    // ルーム名を表示
    getRoomDisplayName() {
        const roomNames = {
            'default': 'メイン',
            'spring': '春',
            'summer': '夏',
            'autumn': '秋',
            'winter': '冬',
            'food': '食べたい',
            'play': '遊びたい',
            'learn': '学びたい',
            'travel': '旅行したい'
        };
        return roomNames[this.currentRoom] || this.currentRoom;
    }

    init() {
        this.load();
        this.loadNickname();
        this.loadTheme();
        this.setupEventListeners();
        this.startFloatingAnimation();
        this.updateRoomDisplay();
        
        // 登録ページの場合は特別な処理
        if (this.isRegisterPage()) {
            console.log('登録ページで初期化されました');
        }
    }

    updateRoomDisplay() {
        const roomNameElement = document.getElementById('roomName');
        if (roomNameElement) {
            roomNameElement.textContent = this.getRoomDisplayName();
        }
    }

    // ニックネーム管理
    loadNickname() {
        const savedNickname = localStorage.getItem('yurufuwa_nickname');
        const nicknameInput = document.getElementById('nickname');
        const accountNicknameInput = document.getElementById('accountNickname');
        
        if (nicknameInput && savedNickname) {
            nicknameInput.value = savedNickname;
        }
        if (accountNicknameInput && savedNickname) {
            accountNicknameInput.value = savedNickname;
        }
    }

    // テーマ管理
    loadTheme() {
        const saved = localStorage.getItem('yurufuwa_theme') || 'auto';
        this.applyTheme(saved);
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = saved;
    }

    applyTheme(theme) {
        const body = document.body;
        body.classList.remove('theme-morning', 'theme-day', 'theme-night');
        if (theme === 'morning') body.classList.add('theme-morning');
        else if (theme === 'day') body.classList.add('theme-day');
        else if (theme === 'night') body.classList.add('theme-night');
    }

    saveNickname(nickname) {
        if (nickname && nickname.trim()) {
            localStorage.setItem('yurufuwa_nickname', nickname.trim());
        }
    }

    isRegisterPage() {
        return document.body.classList.contains('register-page') || 
               window.location.pathname.includes('register.html') ||
               !document.getElementById('postsContainer');
    }

    setupEventListeners() {
        const form = document.getElementById('postForm');
        console.log('フォーム要素:', form);
        if (form) {
            form.addEventListener('submit', (e) => {
                console.log('フォーム送信イベントが発火しました');
                this.handleSubmit(e);
            });
        } else {
            console.error('postForm要素が見つかりません');
        }

        // ボタンクリックイベントも直接追加（フォールバック）
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                console.log('ボタンクリックイベントが発火しました');
                e.preventDefault();
                this.handleSubmit(e);
            });
        }

        const filterBar = document.getElementById('filterBar');
        if (filterBar) {
            filterBar.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-btn');
                if (!btn) return;
                const value = btn.getAttribute('data-filter');
                this.applyFilter(value);
                filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        }
    }

    handleSubmit(e) {
        console.log('handleSubmitが呼ばれました');
        e.preventDefault();
        
        const nicknameInput = document.getElementById('nickname');
        const contentInput = document.getElementById('postContent');
        const categorySelect = document.getElementById('category');
        const lifetimeSelect = document.getElementById('lifetime');
        
        const nickname = (nicknameInput?.value || '').trim() || '匿名さん';
        const content = (contentInput?.value || '').trim();
        const category = (categorySelect?.value || '学びたい').trim();
        const lifetime = parseInt(lifetimeSelect?.value || '30', 10);
        
        // ニックネームを保存
        this.saveNickname(nickname);
        
        if (!content) {
            this.showNotification('何をしたいか教えてください！', 'warning');
            return;
        }

        this.createPost(nickname, content, category, lifetime);
        
        // フォームをリセット
        if (contentInput) contentInput.value = '';
        if (nicknameInput) nicknameInput.value = '';
        if (categorySelect) categorySelect.value = categorySelect.value;

        // 投稿成功の通知
        this.showNotification('ふわっと投稿しました！', 'success');

        // 登録ページ（register.html）の場合はホームへ遷移
        if (this.isRegisterPage()) {
            console.log('登録ページからホームへ遷移します');
            
            // ローディング表示
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'block';
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500); // 通知表示後に遷移
        }
    }

    createPost(nickname, content, category, lifetime = 30) {
        const now = new Date();
        const post = {
            id: ++this.postIdCounter,
            nickname,
            content,
            category,
            lifetime: lifetime * 1000, // ミリ秒に変換
            room: this.currentRoom, // ルーム情報を追加
            reactions: { like: 0, cheer: 0, join: 0 },
            reacted: { like: false, cheer: false, join: false },
            createdAt: now.toISOString(),
            isPinned: false
        };

        this.posts.push(post);
        this.renderPost(post);
        
        // ホームページでのみ削除スケジュールを設定
        if (document.getElementById('postsContainer')) {
            this.schedulePostRemoval(post.id, post.lifetime);
        }
        
        this.persist();
    }

    renderPost(post) {
        const template = document.getElementById('postTemplate');
        if (!template) {
            console.log('テンプレートが見つからないため、レンダリングをスキップします');
            return;
        }
        
        const clone = template.content.cloneNode(true);

        const postElement = clone.querySelector('.post-bubble');
        postElement.setAttribute('data-post-id', post.id);

        const catClass = `cat-${(post.category || '').replace(/\s/g, '')}`;
        if (post.category) postElement.classList.add(catClass);

        // 投稿内容を設定
        clone.querySelector('.post-nickname').textContent = post.nickname;
        clone.querySelector('.post-content').textContent = post.content;
        clone.querySelector('.post-time').textContent = this.formatTime(new Date(post.createdAt));
        const badge = clone.querySelector('.post-category-badge');
        if (badge) badge.textContent = post.category || '';

        // タイマーテキストの設定
        const timerText = clone.querySelector('.timer-text');
        if (timerText && post.lifetime) {
            const seconds = Math.floor(post.lifetime / 1000);
            timerText.textContent = `残り${seconds}秒`;
            
            // タイマーアニメーション更新
            const timerBar = clone.querySelector('.timer-bar');
            if (timerBar) {
                timerBar.style.animationDuration = `${seconds}s`;
            }
        }

        // 複数リアクションのイベント
        ['like','cheer','join'].forEach(type => {
            const btn = clone.querySelector(`.react-btn[data-type="${type}"]`);
            const countNode = btn?.querySelector('.count');
            if (countNode) countNode.textContent = String(post.reactions?.[type] || 0);
            if (post.reacted?.[type]) btn?.classList.add('active');
            btn?.addEventListener('click', () => this.toggleReaction(post.id, type));
        });

        // ピン留めボタンのイベント
        const pinBtn = clone.querySelector('.pin-btn');
        if (pinBtn) {
            if (post.isPinned) pinBtn.classList.add('pinned');
            pinBtn.addEventListener('click', () => this.togglePin(post.id));
        }

        // 共有ボタンのイベント
        const shareBtn = clone.querySelector('.share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.sharePost(post));
        }

        // スクリーンショットボタンのイベント
        const screenshotBtn = clone.querySelector('.screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => this.captureScreenshot(post));
        }

        // 投稿を表示
        const container = document.getElementById('postsContainer');
        if (!container) {
            // レンダリング先が無いページ（register.html等）はDOM追加をスキップ
            // ただし投稿データは保存済みなので、ホームで復元される
            return;
        }
        
        // 表示数制限チェック
        this.limitVisiblePosts();
        
        container.appendChild(clone);

        // 浮遊アニメーションを開始
        setTimeout(() => {
            postElement.classList.add('floating');
        }, 100);

        // ランダムな位置に配置
        this.positionPostRandomly(postElement);
        
        // スワイプジェスチャーを追加
        this.addSwipeGesture(postElement);
    }

    positionPostRandomly(element) {
        const container = document.getElementById('postsContainer');
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // ランダムな位置を計算（画面内に収まるように）
        const maxX = containerRect.width - elementRect.width;
        const maxY = containerRect.height - elementRect.height;
        
        const randomX = Math.random() * Math.max(0, maxX);
        const randomY = Math.random() * Math.max(0, maxY);
        
        element.style.position = 'absolute';
        element.style.left = `${randomX}px`;
        element.style.top = `${randomY}px`;
    }

    toggleReaction(postId, type) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        const btn = postElement?.querySelector(`.react-btn[data-type="${type}"]`);
        const countNode = btn?.querySelector('.count');

        const currently = !!post.reacted[type];
        post.reacted[type] = !currently;
        post.reactions[type] += post.reacted[type] ? 1 : -1;
        if (post.reactions[type] < 0) post.reactions[type] = 0;

        if (btn) btn.classList.toggle('active', post.reacted[type]);
        if (countNode) countNode.textContent = String(post.reactions[type]);

        const total = (post.reactions.like || 0) + (post.reactions.cheer || 0) + (post.reactions.join || 0);
        this.updateBubbleSize(postElement, total);

        this.createEmojiBurst(postElement, type);

        // 通知ログ: 追加リアクション時のみ保存
        if (post.reacted[type]) {
            try {
                const raw = localStorage.getItem('yurufuwa_notifications');
                const list = raw ? JSON.parse(raw) : [];
                list.unshift({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    postId: post.id,
                    nickname: post.nickname,
                    content: post.content,
                    category: post.category,
                    reactionType: type,
                    createdAt: new Date().toISOString()
                });
                if (list.length > 100) list.length = 100;
                localStorage.setItem('yurufuwa_notifications', JSON.stringify(list));
            } catch (e) {
                console.warn('failed to write notifications', e);
            }
        }

        this.persist();
    }

    updateBubbleSize(element, total) {
        if (!element) return;
        element.classList.remove('large-bubble', 'extra-large-bubble');
        if (total >= 6) {
            element.classList.add('extra-large-bubble');
        } else if (total >= 3) {
            element.classList.add('large-bubble');
        }
    }

    togglePin(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        const pinBtn = postElement?.querySelector('.pin-btn');
        const timerBar = postElement?.querySelector('.timer-bar');

        post.isPinned = !post.isPinned;
        
        if (pinBtn) {
            pinBtn.classList.toggle('pinned', post.isPinned);
        }
        
        if (timerBar) {
            timerBar.style.animationPlayState = post.isPinned ? 'paused' : 'running';
        }

        this.persist();
        
        const message = post.isPinned ? 'ピン留めしました！' : 'ピン留めを解除しました！';
        this.showNotification(message, 'success');
    }

    async sharePost(post) {
        const shareText = `${post.nickname}さん: "${post.content}" #ゆるふわボード`;
        const shareUrl = window.location.origin + window.location.pathname;
        
        const shareData = {
            title: 'ゆるふわやりたいことボード',
            text: shareText,
            url: shareUrl
        };

        try {
            // Web Share API が利用可能な場合
            if (navigator.share) {
                await navigator.share(shareData);
                this.showNotification('共有しました！', 'success');
            } else {
                // フォールバック: クリップボードにコピー
                await navigator.clipboard.writeText(shareText);
                this.showNotification('テキストをコピーしました！', 'success');
            }
            
            // 共有ボタンにアニメーション
            const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
            const shareBtn = postElement?.querySelector('.share-btn');
            if (shareBtn) {
                shareBtn.classList.add('shared');
                setTimeout(() => shareBtn.classList.remove('shared'), 600);
            }
        } catch (error) {
            console.error('共有エラー:', error);
            this.showNotification('共有に失敗しました', 'warning');
        }
    }

    async captureScreenshot(post) {
        const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
        if (!postElement) return;

        try {
            // html2canvasライブラリを使用してスクリーンショット
            const canvas = await this.elementToCanvas(postElement, post);
            
            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.download = `yurufuwa-post-${post.id}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            this.showNotification('スクリーンショットを保存しました！', 'success');
            
            // ボタンにアニメーション
            const screenshotBtn = postElement.querySelector('.screenshot-btn');
            if (screenshotBtn) {
                screenshotBtn.classList.add('captured');
                setTimeout(() => screenshotBtn.classList.remove('captured'), 600);
            }
        } catch (error) {
            console.error('スクリーンショットエラー:', error);
            this.showNotification('スクリーンショットに失敗しました', 'warning');
        }
    }

    async elementToCanvas(element, post) {
        // 簡易的なスクリーンショット機能（html2canvasなし）
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 要素のサイズを取得
        const rect = element.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // 背景を描画
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // テキストを描画
        ctx.fillStyle = '#333333';
        ctx.font = '16px Zen Maru Gothic, sans-serif';
        ctx.textAlign = 'left';
        
        const text = `${post.nickname}: ${post.content}`;
        const lines = this.wrapText(ctx, text, canvas.width - 40);
        
        lines.forEach((line, index) => {
            ctx.fillText(line, 20, 30 + index * 20);
        });
        
        return canvas;
    }

    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    // メモリ管理: 表示投稿数を制限
    limitVisiblePosts() {
        const visiblePosts = document.querySelectorAll('.post-bubble');
        if (visiblePosts.length >= this.maxVisiblePosts) {
            // 古い投稿から非表示にする（ピン留めは除外）
            const postsToHide = Array.from(visiblePosts)
                .filter(post => !post.querySelector('.pin-btn.pinned'))
                .slice(0, visiblePosts.length - this.maxVisiblePosts + 1);
            
            postsToHide.forEach(post => {
                post.style.display = 'none';
                console.log('古い投稿を非表示にしました');
            });
        }
    }

    // スワイプジェスチャーを追加
    addSwipeGesture(element) {
        let startX = 0;
        let startY = 0;
        let isSwipping = false;

        element.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwipping = true;
        });

        element.addEventListener('touchmove', (e) => {
            if (!isSwipping) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;
            
            // 水平スワイプが垂直より大きい場合のみ処理
            if (Math.abs(diffX) > Math.abs(diffY)) {
                e.preventDefault();
                
                if (diffX > 50) {
                    element.classList.add('swipe-right');
                } else if (diffX < -50) {
                    element.classList.add('swipe-left');
                }
            }
        });

        element.addEventListener('touchend', () => {
            isSwipping = false;
            element.classList.remove('swipe-left', 'swipe-right');
        });
    }

    schedulePostRemoval(postId, lifetime = 15000) {
        setTimeout(() => {
            this.removePost(postId);
        }, lifetime); // 指定された寿命で削除
    }

    removePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post && post.isPinned) {
            console.log('ピン留めされた投稿は削除しません');
            return;
        }

        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            // フェードアウトアニメーション
            postElement.style.animation = 'bubble-disappear 0.5s ease-out forwards';
            
            setTimeout(() => {
                postElement.remove();
            }, 500);
        }
        
        // 配列からも削除
        this.posts = this.posts.filter(p => p.id !== postId);
        this.persist();
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 60) {
            return `${seconds}秒前`;
        } else if (seconds < 3600) {
            return `${Math.floor(seconds / 60)}分前`;
        } else {
            return `${Math.floor(seconds / 3600)}時間前`;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // スタイルを設定
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#ff6b9d' : type === 'warning' ? '#ff9a9e' : '#8b7f8b'};
            color: white;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Zen Maru Gothic', sans-serif;
            font-size: 0.9rem;
            z-index: 1000;
            animation: notification-appear 0.3s ease-out;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        // 3秒後に削除
        setTimeout(() => {
            notification.style.animation = 'notification-disappear 0.3s ease-out forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    startFloatingAnimation() {
        // 定期的に投稿の位置を微調整して浮遊感を演出
        setInterval(() => {
            const posts = document.querySelectorAll('.post-bubble');
            posts.forEach(post => {
                if (Math.random() < 0.1) { // 10%の確率で位置を微調整
                    const currentX = parseFloat(post.style.left) || 0;
                    const currentY = parseFloat(post.style.top) || 0;
                    
                    const deltaX = (Math.random() - 0.5) * 20;
                    const deltaY = (Math.random() - 0.5) * 20;
                    
                    post.style.left = `${Math.max(0, currentX + deltaX)}px`;
                    post.style.top = `${Math.max(0, currentY + deltaY)}px`;
                }
            });
        }, 2000);
    }

    persist() {
        try {
            localStorage.setItem('yurufuwa_posts', JSON.stringify(this.posts));
            localStorage.setItem('yurufuwa_counter', String(this.postIdCounter));
        } catch (e) {
            this.showNotification('保存できませんでした', 'warning');
        }
    }

    load() {
        try {
            const raw = localStorage.getItem('yurufuwa_posts');
            const counter = localStorage.getItem('yurufuwa_counter');
            if (counter) this.postIdCounter = parseInt(counter, 10) || 0;

            if (!raw) return;
            const arr = JSON.parse(raw);
            const now = Date.now();
            arr.forEach(post => {
                // ルームフィルタリング
                const postRoom = post.room || 'default';
                if (postRoom !== this.currentRoom) return;

                const created = new Date(post.createdAt).getTime();
                const elapsed = now - created;
                const lifetime = post.lifetime || 15000; // デフォルト15秒
                
                if (elapsed >= lifetime) return;

                post.reactions = post.reactions || { like: 0, cheer: 0, join: 0 };
                post.reacted = post.reacted || { like: false, cheer: false, join: false };
                post.isPinned = post.isPinned || false;
                post.room = postRoom; // ルーム情報を保持

                this.posts.push(post);
                this.renderPost(post);

                const remain = lifetime - elapsed;
                setTimeout(() => this.removePost(post.id), remain);
            });
        } catch (e) {
            console.warn('load failed', e);
        }
    }

    applyFilter(filter) {
        const nodes = document.querySelectorAll('.post-bubble');
        nodes.forEach(node => {
            if (filter === 'all') {
                node.style.display = '';
                return;
            }
            const matched = node.className.includes(`cat-${filter.replace(/\s/g, '')}`);
            node.style.display = matched ? '' : 'none';
        });
    }
}

// CSS アニメーションを動的に追加
const style = document.createElement('style');
style.textContent = `
    @keyframes heart-float {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(-50px) scale(1.5);
        }
    }
    
    @keyframes bubble-disappear {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(0.3);
        }
    }
    
    @keyframes notification-appear {
        0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes notification-disappear {
        0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

// アカウント設定保存（グローバル関数）
function saveAccountSettings() {
    const nicknameInput = document.getElementById('accountNickname');
    const themeSelect = document.getElementById('themeSelect');
    if (nicknameInput) {
        const nickname = nicknameInput.value.trim();
        if (!nickname) {
            alert('ニックネームを入力してください');
            return;
        }
        localStorage.setItem('yurufuwa_nickname', nickname);
    }
    if (themeSelect) {
        const theme = themeSelect.value;
        localStorage.setItem('yurufuwa_theme', theme);
        const app = window.__yurufuwaAppInstance;
        if (app && typeof app.applyTheme === 'function') {
            app.applyTheme(theme);
        } else {
            document.body.classList.remove('theme-morning','theme-day','theme-night');
            if (theme === 'morning') document.body.classList.add('theme-morning');
            else if (theme === 'day') document.body.classList.add('theme-day');
            else if (theme === 'night') document.body.classList.add('theme-night');
        }
    }
    alert('設定を保存しました！');
}

// アプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    const app = new YurufuwaApp();
    window.__yurufuwaAppInstance = app;
});

// ページの可視性が変わった時の処理（バックグラウンドから戻った時など）
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // ページが表示された時に軽いアニメーションを再開
        const posts = document.querySelectorAll('.post-bubble');
        posts.forEach(post => {
            post.classList.add('floating');
        });
    }
});

// タッチデバイスでの操作を最適化
if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
    
    // タッチ時のハイライト効果を追加
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
        .touch-device .react-btn:active {
            transform: scale(0.95);
        }
        
        .touch-device .submit-btn:active {
            transform: translateY(0) scale(0.98);
        }
        
        .touch-device .share-btn:active,
        .touch-device .pin-btn:active,
        .touch-device .screenshot-btn:active {
            transform: scale(0.9);
        }
    `;
    document.head.appendChild(touchStyle);
}
