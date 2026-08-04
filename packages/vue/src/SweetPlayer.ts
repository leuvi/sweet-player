import {
  defineComponent,
  getCurrentInstance,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
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
  type PlayerPrefs,
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
    shareUrl: String,
    loop: Boolean,
    autoQuality: { type: Boolean, default: true },
    persist: { type: Boolean, default: true },
    autoNext: [Boolean, Number] as PropType<boolean | number>,
    locale: String,
    localeStrings: Object as PropType<Record<string, string>>,
    hiddenControls: Array as PropType<ControlName[]>,
    plugins: Array as PropType<SweetPlayerPlugin[]>,
    hlsConfig: Object as PropType<Record<string, unknown>>,
    dashConfig: Object as PropType<Record<string, unknown>>,
    onSavePrefs: Function as PropType<(prefs: PlayerPrefs) => void | Promise<void>>,
    onSaveProgress: Function as PropType<(id: string, seconds: number | null) => void | Promise<void>>,
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
    const instance = getCurrentInstance();
    const containerRef = ref<HTMLDivElement>();
    const player = shallowRef<CorePlayer | null>(null);
    const emitPrev = () => emit('prev');
    const emitNext = () => emit('next');
    const emitQualityChange = (quality: QualityLevel) => emit('quality-change', quality);
    const emitAudioTrackChange = (track: AudioTrackInfo) => emit('audio-track-change', track);
    const hasListener = (name: 'onPrev' | 'onNext') => {
      const vnodeProps = instance?.vnode.props;
      return vnodeProps?.[name] != null || vnodeProps?.[`${name}Once`] != null;
    };

    const syncCallbacks = () => {
      player.value?.setCallbacks({
        onPrev: hasListener('onPrev') ? emitPrev : undefined,
        onNext: hasListener('onNext') ? emitNext : undefined,
        onQualityChange: emitQualityChange,
        onAudioTrackChange: emitAudioTrackChange,
        onSavePrefs: props.onSavePrefs,
        onSaveProgress: props.onSaveProgress,
      });
    };

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
        shareUrl: props.shareUrl,
        loop: props.loop,
        autoQuality: props.autoQuality,
        persist: props.persist,
        autoNext: props.autoNext,
        locale: props.locale,
        localeStrings: props.localeStrings,
        hiddenControls: props.hiddenControls,
        plugins: props.plugins,
        hlsConfig: props.hlsConfig,
        dashConfig: props.dashConfig,
        onSavePrefs: props.onSavePrefs,
        onSaveProgress: props.onSaveProgress,
        ...(hasListener('onPrev') && { onPrev: emitPrev }),
        ...(hasListener('onNext') && { onNext: emitNext }),
        onQualityChange: emitQualityChange,
        onAudioTrackChange: emitAudioTrackChange,
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

    watch([() => props.onSavePrefs, () => props.onSaveProgress], syncCallbacks);
    // 父组件的其他更新也可能同时增删事件监听器；此时刷新导航按钮状态。
    onUpdated(syncCallbacks);

    // id 必须先于 src 更新：setId 保存旧进度依赖旧媒体 currentTime，
    // 若先 load 换源，旧媒体被 detach/重置，进度会丢失
    watch(
      () => props.id,
      (id) => {
        if (player.value) player.value.setId(id ?? null);
      },
    );

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
