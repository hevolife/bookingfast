import { usePlugins } from './usePlugins';

export function usePluginPermissions() {
  const { hasPluginAccess } = usePlugins();

  const checkPluginAccess = async (pluginSlug: string): Promise<boolean> => {
    return await hasPluginAccess(pluginSlug);
  };

  return {
    checkPluginAccess
  };
}
