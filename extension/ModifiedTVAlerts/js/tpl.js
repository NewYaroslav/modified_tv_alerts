const tpl = `
    <div class="tv-watcher-container" :class="{open: isOpen, watch: isWatch}" @click="globalClick">
        <div v-if="!isNotyOn">Alerts OFF</div>
        <div class="tv-watch">
            <div v-if="!isWatch">Старт</div>
            <div v-else style="text-align: center;">
                <p>Слежу</p>
                <b>{{title}}</b>
            </div>
        </div>
    </div>
`;