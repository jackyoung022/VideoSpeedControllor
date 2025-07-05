// ==UserScript==
// @name         Video Speed Controller with Conditional UI
// @version      1.2
// @description  解锁视频播放速度限制，只有在页面有视频时才显示控制条，自由调速 UI + 快捷键控制播放速度。
// @author       Jack Young
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    const showOverlay = (rate) => {
    const video = document.querySelector('video');
    if (!video) return;

    let overlay = video.parentElement.querySelector('.vsc-rate-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'vsc-rate-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.color = 'white';
        overlay.style.fontSize = '32px';
        overlay.style.padding = '10px 20px';
        overlay.style.borderRadius = '8px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '99999';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';

        // 让 overlay 挂在 video 的父元素（video 一般是 relative 的）
        const parent = video.parentElement;
        parent.style.position = 'relative';
        parent.appendChild(overlay);
    }

    overlay.textContent = `${rate.toFixed(1)}x`;
    overlay.style.opacity = '1';

    clearTimeout(overlay._hideTimeout);
    overlay._hideTimeout = setTimeout(() => {
        overlay.style.opacity = '0';
    }, 1000);
};

    'use strict';

    let uiCreated = false;

    const patchVideo = (video) => {
        if (video.dataset.vscUnlocked) return;
        video.removeAttribute('disableremoteplayback');
        video.removeAttribute('controlsList');
        video.dataset.vscUnlocked = 'true';
        console.log('[VSC] Video unlocked:', video);
    };

    const updateAllVideos = () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(patchVideo);
        maybeShowUI();
    };

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (node.tagName === 'VIDEO') {
                    patchVideo(node);
                    maybeShowUI();
                } else if (node.querySelectorAll) {
                    const videos = node.querySelectorAll('video');
                    videos.forEach(patchVideo);
                    if (videos.length > 0) maybeShowUI();
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', (e) => {
        const video = document.querySelector('video');
        if (!video) return;
        switch (e.key) {
            case '[':
                video.playbackRate = Math.max(0.1, video.playbackRate - 0.1);
                updateUI(video.playbackRate);
                showOverlay(video.playbackRate);
                console.log('[VSC] Playback rate decreased:', video.playbackRate);
                break;
            case ']':
                video.playbackRate = Math.min(16, video.playbackRate + 0.1);
                updateUI(video.playbackRate);
                showOverlay(video.playbackRate);
                console.log('[VSC] Playback rate increased:', video.playbackRate);
                break;
            case '\\':
                video.playbackRate = 1.0;
                updateUI(video.playbackRate);
                showOverlay(video.playbackRate);
                console.log('[VSC] Playback rate reset to 1.0');
                break;
        }
    });

    const createUI = () => {
        if (uiCreated) return;
        uiCreated = true;

        const container = document.createElement('div');
        container.id = 'vsc-ui';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.background = 'rgba(0, 0, 0, 0.8)';
        container.style.color = '#fff';
        container.style.padding = '10px 15px';
        container.style.borderRadius = '10px';
        container.style.zIndex = 999999;
        container.style.fontSize = '14px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '10px';

        const slowerBtn = document.createElement('button');
        slowerBtn.textContent = '-';
        slowerBtn.title = '减速';
        const fasterBtn = document.createElement('button');
        fasterBtn.textContent = '+';
        fasterBtn.title = '加速';
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '1x';
        resetBtn.title = '重置';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.1';
        slider.max = '4';
        slider.step = '0.1';
        slider.value = '1';

        const label = document.createElement('span');
        label.textContent = '1.0x';

        const styleBtn = (btn) => {
            btn.style.padding = '4px 8px';
            btn.style.cursor = 'pointer';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.background = '#444';
            btn.style.color = '#fff';
        };

        [slowerBtn, fasterBtn, resetBtn].forEach(styleBtn);

        const getVideo = () => document.querySelector('video');

        const setRate = (rate) => {
            const video = getVideo();
            if (video) {
                video.playbackRate = rate;
                label.textContent = rate.toFixed(1) + 'x';
                slider.value = rate.toFixed(1);
                showOverlay(rate);
            }
        };

        slowerBtn.onclick = () => {
            const video = getVideo();
            if (video) setRate(Math.max(0.1, video.playbackRate - 0.1));
        };

        fasterBtn.onclick = () => {
            const video = getVideo();
            if (video) setRate(Math.min(16, video.playbackRate + 0.1));
        };

        resetBtn.onclick = () => setRate(1.0);
        slider.oninput = () => setRate(parseFloat(slider.value));

        container.appendChild(slowerBtn);
        container.appendChild(resetBtn);
        container.appendChild(fasterBtn);
        container.appendChild(slider);
        container.appendChild(label);

        document.body.appendChild(container);
    };

    const updateUI = (rate) => {
        const label = document.querySelector('#vsc-ui span');
        const slider = document.querySelector('#vsc-ui input');
        if (label) label.textContent = rate.toFixed(1) + 'x';
        if (slider) slider.value = rate.toFixed(1);
    };

    // ✅ 仅当页面存在 video 元素时才创建 UI
    const maybeShowUI = () => {
        if (!uiCreated && document.querySelector('video')) {
            createUI();
        }
    };

    // 页面初始加载时检查一次
    updateAllVideos();
})();
