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
    autoQuality: { type: Boolean, default: true },
    persist: { type: Boolean, default: true },
    autoNext: [Boolean, Number] as PropType<boolean | number>,
    locale: String,
    localeStrings: Object as PropType<Record<string, string>>,
    hiddenControls: Array as PropType<ControlName[]>,
    plugins: Array as PropType<SweetPlayerPlugin[]>,
    hlsConfig: Object as PropType<Record<string, unknown>>,
  },
  emits: ['ready', 'prev', 'next', 'quality-change', 'audio-track-change'],
  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLDivElement>();
    const player = shallowRef<CorePlayer | null>(null);

    onMounted(() => {
      if (!containerRef.value) return;
      player.value = new CorePlayer({
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
        autoQuality: props.autoQuality,
        persist: props.persist,
        autoNext: props.autoNext,
        locale: props.locale,
        localeStrings: props.localeStrings,
        hiddenControls: props.hiddenControls,
        plugins: props.plugins,
        hlsConfig: props.hlsConfig,
        onPrev: () => emit('prev'),
        onNext: () => emit('next'),
        onQualityChange: (q) => emit('quality-change', q),
        onAudioTrackChange: (t) => emit('audio-track-change', t),
      });
      emit('ready', player.value);
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
