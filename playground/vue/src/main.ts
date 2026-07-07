import { createApp, defineComponent, h, ref } from 'vue';
import { SweetPlayer, type SweetPlayerCore } from '@sweet-player/vue';

const App = defineComponent({
  setup() {
    const core = ref<SweetPlayerCore | null>(null);

    return () =>
      h('div', { class: 'wrap' }, [
        h('h2', 'Sweet Player — Vue 3'),
        h('div', { class: 'player-box' }, [
          h(SweetPlayer, {
            src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            title: 'Big Buck Bunny — Vue',
            volume: 80,
            onReady: (p: SweetPlayerCore) => {
              core.value = p;
              console.log('[vue] ready');
            },
            onPrev: () => console.log('[vue] prev'),
            onNext: () => console.log('[vue] next'),
          }),
        ]),
        h('button', { onClick: () => core.value?.seekBy(30) }, 'ready 实例调用：快进 30s'),
      ]);
  },
});

createApp(App).mount('#app');
