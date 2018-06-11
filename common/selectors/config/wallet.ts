import { InsecureWalletName, SecureWalletName, WalletName, walletNames } from 'config';
import { EXTRA_PATHS } from 'config/dpaths';
import uniqBy from 'lodash/uniqBy';
import difference from 'lodash/difference';
import { StaticNetworkConfig, DPathFormats } from 'types/network';
import { AppState } from 'reducers';
import { getStaticNetworkConfigs, getStaticNetworkConfig } from 'selectors/config';

type PathType = keyof DPathFormats;

type DPathFormat =
  | SecureWalletName.TREZOR
  | SecureWalletName.LEDGER_NANO_S
  | InsecureWalletName.MNEMONIC_PHRASE;

export function getPaths(state: AppState, pathType: PathType): DPath[] {
  const paths = Object.values(getStaticNetworkConfigs(state))
    .reduce((networkPaths: DPath[], { dPathFormats }): DPath[] => {
      if (dPathFormats && dPathFormats[pathType]) {
        return [...networkPaths, dPathFormats[pathType] as DPath];
      }
      return networkPaths;
    }, [])
    .concat(EXTRA_PATHS);
  return uniqBy(paths, p => `${p.label}${p.value}`);
}

export function getSingleDPath(state: AppState, format: DPathFormat): DPath | undefined {
  const network = getStaticNetworkConfig(state);
  if (!network) {
    throw Error('No static network config loaded');
  }
  const dPathFormats = network.dPathFormats;
  return dPathFormats[format];
}

export function isNetworkUnit(state: AppState, unit: string) {
  const currentNetwork = getStaticNetworkConfig(state);
  //TODO: logic check
  if (!currentNetwork) {
    return false;
  }
  const networks = getStaticNetworkConfigs(state);
  const validNetworks = Object.values(networks).filter((n: StaticNetworkConfig) => n.unit === unit);
  return validNetworks.includes(currentNetwork);
}

export function isWalletFormatSupportedOnNetwork(state: AppState, format: WalletName): boolean {
  const network = getStaticNetworkConfig(state);
  const chainId = network ? network.chainId || 0;

  const CHECK_FORMATS: DPathFormat[] = [
    SecureWalletName.LEDGER_NANO_S,
    SecureWalletName.TREZOR,
    InsecureWalletName.MNEMONIC_PHRASE
  ];

  const isHDFormat = (f: string): f is DPathFormat => CHECK_FORMATS.includes(f as DPathFormat);

  // Ensure DPath's are found
  if (isHDFormat(format)) {
    if (!network) {
      return false;
    }
    const dPath = network.dPathFormats && network.dPathFormats[format];
    return !!dPath;
  }

  // Parity signer on RSK
  if (chainId === 30 || chainId === 31 && format === SecureWalletName.PARITY_SIGNER) {
    return false;
  }

  // All other wallet formats are supported
  return true;
}

export function unSupportedWalletFormatsOnNetwork(state: AppState): WalletName[] {
  const supportedFormats = walletNames.filter((walletName: WalletName) =>
    isWalletFormatSupportedOnNetwork(state, walletName)
  );
  return difference(walletNames, supportedFormats);
}
