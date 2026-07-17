import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType,
} from 'vue';
import {
  SweetPlayer as CorePlayer,
  type AspectRatio,
  type AudioTrackInfo,
  type ControlName,
  type HeatmapPoint,
  type LongSeekOptions,
  type QualityLevel,
  type SweetPlayerPlugin,
} from '@sweet-player/core';

export const SweetPlayer = defineComponent({
  name: 'SweetPlayer',
  props: {
    src: { type: String, required: true },
    title: String,
    id: String,
    autoplay: Boolean,
    muted: Boolean,
    volume: Number,
    seekStep: Number,
    longSeek: Object as PropType<LongSeekOptions>,
    playbackRates: Array as PropType<number[]>,
    aspectRatios: Array as PropType<AspectRatio[]>,
    qualities: Array as PropType<QualityLevel[]>,
    audioTracks: Array as PropType<AudioTrackInfo[]>,
    heatmap: Array as PropType<HeatmapPoint[]>,
    poster: String,
    thumbnails: String,
    autoQuality: { type: Boolean, default: true },
    persist: { type: Boolean, default: true },
    autoNext: [Boolean, Number] as PropType<boolean | number>,
    locale: String,
    localeStrings: Object as PropType<Record<string, string>>,
    hiddenControls: Array as PropType<ControlName[]>,
    plugins: Array as PropType<SweetPlayerPlugin[]>,
    hlsConfig: Object as PropType<Record<string, unknown>>,
    dashConfig: Object as PropType<Record<string, unknown>>,
  },
  emits: [
    'ready',
    'prev',
    'next',
    'quality-change',
    'audio-track-change',
    'play',
    'pause',
    'ended',
    'timeupdate',
    'volumechange',
    'ratechange',
    'error',
  ],
  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLDivElement>();
    const player = shallowRef<CorePlayer | null>(null);

    onMounted(() => {
      if (!containerRef.value) return;
      const p = new CorePlayer({
        container: containerRef.value,
        src: props.src,
        title: props.title,
        id: props.id,
        autoplay: props.autoplay,
        muted: props.muted,
        volume: props.volume,
        seekStep: props.seekStep,
        longSeek: props.longSeek,
        playbackRates: props.playbackRates,
        aspectRatios: props.aspectRatios,
        qualities: props.qualities,
        audioTracks: props.audioTracks,
        heatmap: props.heatmap,
        poster: props.poster,
        thumbnails: props.thumbnails,
        autoQuality: props.autoQuality,
        persist: props.persist,
        autoNext: props.autoNext,
        locale: props.locale,
        localeStrings: props.localeStrings,
        hiddenControls: props.hiddenControls,
        plugins: props.plugins,
        hlsConfig: props.hlsConfig,
        dashConfig: props.dashConfig,
        onPrev: () => emit('prev'),
        onNext: () => emit('next'),
        onQualityChange: (q) => emit('quality-change', q),
        onAudioTrackChange: (t) => emit('audio-track-change', t),
      });
      // 桥接核心播放事件到 Vue emits
      p.on('play', () => emit('play'));
      p.on('pause', () => emit('pause'));
      p.on('ended', () => emit('ended'));
      p.on('timeupdate', (payload) => emit('timeupdate', payload));
      p.on('volumechange', (payload) => emit('volumechange', payload));
      p.on('ratechange', (rate) => emit('ratechange', rate));
      p.on('error', (payload) => emit('error', payload));
      player.value = p;
      emit('ready', p);
    });

    watch(
      () => props.src,
      (src) => {
        if (player.value && src) player.value.load(src);
      },
    );

    watch(
      () => props.title,
      (title) => player.value?.setTitle(title ?? ''),
    );

    watch(
      () => props.qualities,
      (qualities) => {
        if (qualities) player.value?.setQualities(qualities);
      },
    );

    watch(
      () => props.audioTracks,
      (tracks) => {
        if (tracks) player.value?.setAudioTracks(tracks);
      },
    );

    onBeforeUnmount(() => {
      player.value?.destroy();
      player.value = null;
    });

    expose({ player });

    return () =>
      h('div', {
        ref: containerRef,
        style: { width: '100%', height: '100%' },
      });
  },
});
