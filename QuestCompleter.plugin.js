/**
 * @name QuestCompleter
 * @author zef
 * @description Adds a Quest Completer button to complete any active tasks.
 * @version 1.5.2
 * @source https://github.com/VZefoq/Discord-Quest-Completer
 * @updateUrl https://raw.githubusercontent.com/VZefoq/Discord-Quest-Completer/main/QuestCompleter.plugin.js
 */

module.exports = class QuestCompleter {
    constructor(meta) {
        this.meta = meta;
        this.button  = null;
        this.tooltip = null;
        this.style   = null;
        this.observer = null;
        this._ttTimeout = null;
        this._doneTimeout = null;
    }

    getName()        { return this.meta.name; }
    getDescription() { return this.meta.description; }
    getVersion()     { return this.meta.version; }
    getAuthor()      { return this.meta.author; }

    start() {
        this.injectStyles();
        this.createTooltip();
        this.mountButton();

        this.observer = new MutationObserver(() => {
            if (!document.getElementById("quest-completer-btn")) {
                clearTimeout(this._doneTimeout);
                this.button = null;
                this.mountButton();
            }
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    stop() {
        if (this.observer) { this.observer.disconnect(); this.observer = null; }
        if (this.button)   { this.button.remove();       this.button   = null; }
        if (this.tooltip)  { this.tooltip.remove();      this.tooltip  = null; }
        if (this.style)    { this.style.remove();        this.style    = null; }
        clearTimeout(this._ttTimeout);
        clearTimeout(this._doneTimeout);
    }

    // Tooltip
    createTooltip() {
        this.tooltip = document.createElement("div");
        this.tooltip.id = "quest-completer-tooltip";
        document.body.appendChild(this.tooltip);
    }

    showTooltip(text) {
        if (!this.button || !this.tooltip) return;
        clearTimeout(this._ttTimeout);

        this.tooltip.textContent = text;
        this.tooltip.classList.add("qc-tt-visible");

        const r = this.button.getBoundingClientRect();
        const tw = this.tooltip.offsetWidth;
        const th = this.tooltip.offsetHeight;
        let left = r.left + r.width / 2 - tw / 2;
        let top  = r.top - th - 10;

        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        this.tooltip.style.left = left + "px";
        this.tooltip.style.top  = top  + "px";
    }

    hideTooltip() {
        if (!this.tooltip) return;
        this.tooltip.classList.remove("qc-tt-visible");
    }

    // Button
    mountButton() {
        const toolbar = document.querySelector("div[class*='buttons__']");
        if (!toolbar) return;

        this.button = document.createElement("button");
        this.button.id = "quest-completer-btn";
        this.button.setAttribute("aria-label", "Complete Quests");
        this.button.setAttribute("type", "button");

        const nativeClass = toolbar.querySelector("button[class*='button__']")?.className ?? "";
        this.button.className = nativeClass;
        this.button.classList.add("qc-toolbar-btn");

        this.setLabel("idle");

        this.button.addEventListener("click",      () => this.runQuestScript());
        this.button.addEventListener("mouseenter", () => this.showTooltip(this._currentTooltipText));
        this.button.addEventListener("mouseleave", () => this.hideTooltip());
        this.button.addEventListener("mousedown",  () => this.hideTooltip());

        const firstMicGroup = toolbar.querySelector("div[class*='micButtonParent__']");
        if (firstMicGroup) {
            toolbar.insertBefore(this.button, firstMicGroup);
        } else {
            toolbar.prepend(this.button);
        }
    }

    // Styles
    injectStyles() {
        this.style = document.createElement("style");
        this.style.id = "quest-completer-styles";
        this.style.textContent = `
            button#quest-completer-btn.qc-toolbar-btn {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                color: #ffffff;
                background: transparent;
                padding: 0;
                flex-shrink: 0;
                transition: background 0.1s ease;
            }
            button#quest-completer-btn.qc-toolbar-btn:hover {
                background: var(--background-modifier-hover, rgba(79,84,92,0.16));
                color: #ffffff;
            }
            button#quest-completer-btn.qc-toolbar-btn:hover svg {
                animation: qc-wiggle 0.4s ease;
            }
            button#quest-completer-btn.qc-toolbar-btn:active {
                background: var(--background-modifier-active, rgba(79,84,92,0.24));
                color: #ffffff;
            }
            button#quest-completer-btn.qc-toolbar-btn.qc-running {
                color: #3ba55c;
                animation: qc-spin 1.2s linear infinite;
            }
            button#quest-completer-btn.qc-toolbar-btn.qc-done {
                color: #3ba55c;
                cursor: default;
            }
            @keyframes qc-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            @keyframes qc-wiggle {
                0%, 100% { transform: rotate(0deg); }
                25%      { transform: rotate(-5deg); }
                50%      { transform: rotate(5deg); }
                75%      { transform: rotate(-3deg); }
            }

            /* ── Discord-accurate tooltip ── */
            #quest-completer-tooltip {
                position: fixed;
                z-index: 100000;
                pointer-events: none;

                /* Discord uses a dark semi-opaque surface */
                background: var(--background-floating, #111214);
                color: var(--text-normal, #dbdee1);
                font-family: 'gg sans', 'Noto Sans', Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                line-height: 1;
                padding: 8px 12px;
                border-radius: 5px;
                box-shadow: var(--elevation-high, 0 8px 16px rgba(0,0,0,0.24));
                white-space: nowrap;

                /* Hidden by default */
                opacity: 0;
                transform: scale(0.95);
                transition: opacity 0.1s ease, transform 0.1s ease;
            }
            #quest-completer-tooltip.qc-tt-visible {
                opacity: 1;
                transform: scale(1);
            }
            /* Small downward-pointing arrow */
            #quest-completer-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: var(--background-floating, #111214);
            }
        `;
        document.head.appendChild(this.style);
    }

    // Label states
    setLabel(state) {
        if (!this.button) return;
        this.button.classList.remove("qc-running", "qc-done");

        if (state === "idle") {
            this._currentTooltipText = "Complete Quests";
            this.button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20 7h-2.151A3.007 3.007 0 0 0 18 6a3 3 0 0 0-3-3c-1.677 0-2.837 1.282-3 1.5C11.837 4.282 10.677 3 9 3a3 3 0 0 0-3 3 3.007 3.007 0 0 0 .151 1H4a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h1v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6h1a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2zm-5-5a1 1 0 1 1 0 2c-.438 0-1.033-.568-1.377-1H15zm-6 0a1 1 0 1 1 0 2h-.623C8.033 3.568 7.438 3 7 3a1 1 0 0 1 0 0zm-3 7h5v2H4V9zm2 10v-6h4v6H6zm6 0v-6h4v6h-4zm6-8h-2V9h2v2z"/>
                </svg>`;

        } else if (state === "running") {
            this.button.classList.add("qc-running");
            this._currentTooltipText = "Running...";
            this.button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"
                        stroke-linecap="round" stroke-dasharray="42 14"/>
                </svg>`;

        } else if (state === "done") {
            this.button.classList.add("qc-done");
            this._currentTooltipText = "Done!";
            this.button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>`;
        }

        if (this.tooltip?.classList.contains("qc-tt-visible")) {
            this.showTooltip(this._currentTooltipText);
        }
    }

    // Quest script
    runQuestScript() {
        if (!this.button) return;
        if (this.button.classList.contains("qc-running") || this.button.classList.contains("qc-done")) return;

        this.hideTooltip();
        this.setLabel("running");

        const markDone = () => {
            this.setLabel("done");
            this._doneTimeout = setTimeout(() => this.setLabel("idle"), 2000);
        };
        const markError = () => { this.setLabel("idle"); };

        try {
            delete window.$;
            let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
            webpackChunkdiscord_app.pop();

            let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
            let RunningGameStore, QuestsStore, ChannelStore, GuildChannelStore, FluxDispatcher, api;

            if (!ApplicationStreamingStore) {
                ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata).exports.A;
                RunningGameStore  = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames).exports.Ay;
                QuestsStore       = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest).exports.A;
                ChannelStore      = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent).exports.A;
                GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel).exports.Ay;
                FluxDispatcher    = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue).exports.h;
                api               = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get).exports.Bo;
            } else {
                RunningGameStore  = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
                QuestsStore       = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
                ChannelStore      = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent).exports.Z;
                GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel).exports.ZP;
                FluxDispatcher    = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
                api               = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn;
            }

            const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
            let quests = [...QuestsStore.quests.values()].filter(x =>
                x.userStatus?.enrolledAt &&
                !x.userStatus?.completedAt &&
                new Date(x.config.expiresAt).getTime() > Date.now() &&
                supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y))
            );
            const isApp = typeof DiscordNative !== "undefined";

            if (quests.length === 0) {
                console.log("[QuestCompleter] No uncompleted quests found.");
                markDone();
                return;
            }

            let doJob = () => {
                const quest = quests.pop();
                if (!quest) return;

                const pid             = Math.floor(Math.random() * 30000) + 1000;
                const applicationId   = quest.config.application.id;
                const applicationName = quest.config.application.name;
                const questName       = quest.config.messages.questName;
                const taskConfig      = quest.config.taskConfig ?? quest.config.taskConfigV2;
                const taskName        = supportedTasks.find(x => taskConfig.tasks[x] != null);
                const secondsNeeded   = taskConfig.tasks[taskName].target;
                let secondsDone       = quest.userStatus?.progress?.[taskName]?.value ?? 0;

                if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
                    const maxFuture = 10, speed = 7, interval = 1;
                    const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
                    let completed = false;
                    (async () => {
                        while (true) {
                            const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
                            const diff       = maxAllowed - secondsDone;
                            const timestamp  = secondsDone + speed;
                            if (diff >= speed) {
                                const res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) } });
                                completed   = res.body.completed_at != null;
                                secondsDone = Math.min(secondsNeeded, timestamp);
                            }
                            if (timestamp >= secondsNeeded) break;
                            await new Promise(r => setTimeout(r, interval * 1000));
                        }
                        if (!completed) {
                            await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
                        }
                        console.log("[QuestCompleter] Quest completed!");
                        doJob();
                    })();
                    console.log(`[QuestCompleter] Spoofing video for ${questName}.`);

                } else if (taskName === "PLAY_ON_DESKTOP") {
                    if (!isApp) {
                        console.log("[QuestCompleter] Desktop app required for", questName);
                    } else {
                        api.get({ url: `/applications/public?application_ids=${applicationId}` }).then(res => {
                            const appData = res.body[0];
                            const exeEntry = (appData.executables ?? []).find(x => x.os === "win32")
                                          ?? (appData.executables ?? [])[0];
                            const exeName = (exeEntry?.name ?? `${appData.name}.exe`).replace(">", "");
                            const fakeGame = {
                                cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                                exeName, exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                                hidden: false, isLauncher: false, id: applicationId, name: appData.name,
                                pid, pidPath: [pid], processName: appData.name, start: Date.now(),
                            };
                            const realGames           = RunningGameStore.getRunningGames();
                            const fakeGames           = [fakeGame];
                            const realGetRunningGames = RunningGameStore.getRunningGames;
                            const realGetGameForPID   = RunningGameStore.getGameForPID;
                            RunningGameStore.getRunningGames = () => fakeGames;
                            RunningGameStore.getGameForPID   = (pid) => fakeGames.find(x => x.pid === pid);
                            FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });
                            let fn = data => {
                                let progress = quest.config.configVersion === 1
                                    ? data.userStatus.streamProgressSeconds
                                    : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                                console.log(`[QuestCompleter] Progress: ${progress}/${secondsNeeded}`);
                                if (progress >= secondsNeeded) {
                                    console.log("[QuestCompleter] Quest completed!");
                                    RunningGameStore.getRunningGames = realGetRunningGames;
                                    RunningGameStore.getGameForPID   = realGetGameForPID;
                                    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: [] });
                                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                    doJob();
                                }
                            };
                            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                            console.log(`[QuestCompleter] Spoofed game to ${applicationName}. ~${Math.ceil((secondsNeeded - secondsDone) / 60)} min remaining.`);
                        });
                    }

                } else if (taskName === "STREAM_ON_DESKTOP") {
                    if (!isApp) {
                        console.log("[QuestCompleter] Desktop app required for", questName);
                    } else {
                        let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                        ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({ id: applicationId, pid, sourceName: null });
                        let fn = data => {
                            let progress = quest.config.configVersion === 1
                                ? data.userStatus.streamProgressSeconds
                                : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                            console.log(`[QuestCompleter] Progress: ${progress}/${secondsNeeded}`);
                            if (progress >= secondsNeeded) {
                                console.log("[QuestCompleter] Quest completed!");
                                ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                doJob();
                            }
                        };
                        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                        console.log(`[QuestCompleter] Spoofed stream to ${applicationName}. ~${Math.ceil((secondsNeeded - secondsDone) / 60)} min remaining.`);
                        console.log("[QuestCompleter] Remember: at least 1 other person must be in the VC!");
                    }

                } else if (taskName === "PLAY_ACTIVITY") {
                    const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id
                        ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
                    const streamKey = `call:${channelId}:1`;
                    (async () => {
                        console.log("[QuestCompleter] Completing quest", questName);
                        while (true) {
                            const res      = await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: false } });
                            const progress = res.body.progress.PLAY_ACTIVITY.value;
                            console.log(`[QuestCompleter] Progress: ${progress}/${secondsNeeded}`);
                            await new Promise(r => setTimeout(r, 20 * 1000));
                            if (progress >= secondsNeeded) {
                                await api.post({ url: `/quests/${quest.id}/heartbeat`, body: { stream_key: streamKey, terminal: true } });
                                break;
                            }
                        }
                        console.log("[QuestCompleter] Quest completed!");
                        doJob();
                    })();
                }
            };

            doJob();
            markDone();

        } catch (err) {
            console.error("[QuestCompleter] Error:", err);
            markError();
        }
    }
};