import DefaultTheme from 'vitepress/theme';
import { defineComponent, h, nextTick, watch } from 'vue';
import { useData } from 'vitepress';
import { createMermaidRenderer } from 'vitepress-mermaid-renderer';

const Layout = defineComponent({
  setup() {
    const { isDark } = useData();

    const renderMermaid = () =>
      createMermaidRenderer({ theme: isDark.value ? 'dark' : 'default' });

    nextTick(renderMermaid);
    watch(isDark, renderMermaid);

    return () => h(DefaultTheme.Layout);
  },
});

export default {
  extends: DefaultTheme,
  Layout,
};
