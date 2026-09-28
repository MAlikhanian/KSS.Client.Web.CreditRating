/**
 * KSS MarketData Service (KSS.Service.MarketData)
 *
 * Server-side only functions for MarketData service operations.
 * Base URL from MARKET_DATA_API_BASE_URL env only (set in .env / ConfigMap / k8s).
 */

function getBaseUrl(): string {
  const baseUrl = process.env.MARKET_DATA_API_BASE_URL;
  if (!baseUrl) {
    console.error('[MarketData API] MARKET_DATA_API_BASE_URL is not set in environment variables');
    throw new Error(
      'MARKET_DATA_API_BASE_URL environment variable is required but not set.',
    );
  }
  return baseUrl;
}

function getHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function throwApiError(response: Response, defaultMessage: string) {
  const errorText = await response.text().catch(() => response.statusText);
  if (response.status === 401) {
    throw new Error('Authentication token expired. Please log in again.');
  }
  let message = defaultMessage;
  try {
    const errorJson = JSON.parse(errorText);
    message = errorJson.message || message;
  } catch {
    message = errorText || message;
  }
  throw new Error(message);
}

// ─── Generic Sub-Entity CRUD ───

async function addSubEntity(token: string, entityName: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Api/${entityName}/Add`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await throwApiError(response, `Failed to add ${entityName}.`);
  }

  return response.json();
}

async function updateSubEntity(token: string, entityName: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Api/${entityName}/Update`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await throwApiError(response, `Failed to update ${entityName}.`);
  }
}

async function removeSubEntity(
  token: string,
  entityName: string,
  data: Record<string, unknown>,
  idDataType: number = 9, // 9 = Guid, 2 = Int
) {
  const baseUrl = getBaseUrl();

  // If only id is provided, fetch the full entity first via FindAsync
  let entityData = data;
  if (data.id !== undefined && Object.keys(data).length <= 2) {
    const findUrl = `${baseUrl}/Api/${entityName}/Find`;
    const findResponse = await fetch(findUrl, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ value: data.id, dataType: idDataType }),
    });
    if (findResponse.ok) {
      entityData = await findResponse.json();
    }
  }

  const url = `${baseUrl}/Api/${entityName}/Remove`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify(entityData),
  });

  if (!response.ok) {
    await throwApiError(response, `Failed to remove ${entityName}.`);
  }
}

async function listSubEntity(token: string, entityName: string) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/Api/${entityName}/ToListAll`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    await throwApiError(response, `Failed to list ${entityName}.`);
  }

  return response.json();
}

// ─── MarketType ───
export const listMarketTypes = (token: string) => listSubEntity(token, 'MarketType');
export const listMarketTypeTranslations = (token: string) => listSubEntity(token, 'MarketTypeTranslation');
export const addMarketType = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'MarketType', data);
export const updateMarketType = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'MarketType', data);
export const removeMarketType = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'MarketType', data, 2);
export const addMarketTypeTranslation = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'MarketTypeTranslation', data);
export const updateMarketTypeTranslation = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'MarketTypeTranslation', data);
export const removeMarketTypeTranslation = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'MarketTypeTranslation', data, 2);

// ─── AssetType ───
export const listAssetTypes = (token: string) => listSubEntity(token, 'AssetType');
export const listAssetTypeTranslations = (token: string) => listSubEntity(token, 'AssetTypeTranslation');
export const addAssetType = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'AssetType', data);
export const updateAssetType = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'AssetType', data);
export const removeAssetType = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'AssetType', data, 2);
export const addAssetTypeTranslation = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'AssetTypeTranslation', data);
export const updateAssetTypeTranslation = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'AssetTypeTranslation', data);
export const removeAssetTypeTranslation = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'AssetTypeTranslation', data, 2);

// ─── Sector ───
export const listSectors = (token: string) => listSubEntity(token, 'Sector');
export const listSectorTranslations = (token: string) => listSubEntity(token, 'SectorTranslation');
export const addSector = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'Sector', data);
export const updateSector = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'Sector', data);
export const removeSector = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'Sector', data, 2);
export const addSectorTranslation = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'SectorTranslation', data);
export const updateSectorTranslation = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'SectorTranslation', data);
export const removeSectorTranslation = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'SectorTranslation', data, 2);

// ─── Asset (main entity, uses AddDto / UpdateDto endpoints — returns generated Guid) ───
export const listAssets = (token: string) => listSubEntity(token, 'Asset');
export const listAssetTranslations = (token: string) => listSubEntity(token, 'AssetTranslation');

export async function addAsset(token: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/Api/Asset/AddDto`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to add Asset.');
  return response.json();
}

export async function updateAsset(token: string, data: Record<string, unknown>) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/Api/Asset/UpdateDto`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to update Asset.');
}

export const removeAsset = (token: string, data: Record<string, unknown>) => removeSubEntity(token, 'Asset', data, 9);

export const addAssetTranslation = (token: string, data: Record<string, unknown>) => addSubEntity(token, 'AssetTranslation', data);
export const updateAssetTranslation = (token: string, data: Record<string, unknown>) => updateSubEntity(token, 'AssetTranslation', data);

export async function removeAssetTranslation(token: string, data: Record<string, unknown>) {
  // Composite key (assetId + languageId) — pass full body straight through
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/Api/AssetTranslation/Remove`, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) await throwApiError(response, 'Failed to remove AssetTranslation.');
}
