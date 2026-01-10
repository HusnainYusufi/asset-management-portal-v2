'use client';

import { useEffect, useState, type FormEvent } from 'react';
import PageContainer from '@/components/layout/page-container';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type AssetField = {
  key: string;
  type: string;
  value: string;
  isSecret?: boolean;
};

type AssetRecord = {
  id?: string;
  name?: string;
  type?: string;
  tags?: string[];
  fields?: AssetField[];
};

function normalizeList(payload: unknown, key: string) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object' && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    return Array.isArray(value) ? value : [];
  }
  return [];
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [createFields, setCreateFields] = useState<AssetField[]>([
    { key: '', type: '', value: '' }
  ]);
  const [updateId, setUpdateId] = useState('');
  const [updateName, setUpdateName] = useState('');
  const [updateFields, setUpdateFields] = useState<AssetField[]>([
    { key: '', type: '', value: '' }
  ]);
  const [deleteId, setDeleteId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<AssetRecord | null>(null);
  const [uploadAssetId, setUploadAssetId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteFileAssetId, setDeleteFileAssetId] = useState('');
  const [deleteFileId, setDeleteFileId] = useState('');

  const loadAssets = async () => {
    setLoading(true);
    const response = await apiRequest(
      '/assets',
      { method: 'GET' },
      { auth: true }
    );
    if (!response.ok) {
      setErrorMessage('Failed to load assets.');
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setAssets(normalizeList(payload, 'assets') as AssetRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAssets().catch(() => {
      setErrorMessage('Failed to load assets.');
      setLoading(false);
    });
  }, []);

  const handleCreateFieldChange = (
    index: number,
    field: keyof AssetField,
    value: string | boolean
  ) => {
    setCreateFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleUpdateFieldChange = (
    index: number,
    field: keyof AssetField,
    value: string | boolean
  ) => {
    setUpdateFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleCreateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const tags = createTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await apiRequest(
      '/assets',
      {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          type: createType,
          fields: createFields.filter((field) => field.key && field.type),
          tags
        })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Asset creation failed.');
      return;
    }

    setStatusMessage('Asset created successfully.');
    setCreateName('');
    setCreateType('');
    setCreateTags('');
    setCreateFields([{ key: '', type: '', value: '' }]);
    await loadAssets();
  };

  const handleUpdateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const response = await apiRequest(
      `/assets/${updateId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: updateName || undefined,
          fields: updateFields.filter((field) => field.key && field.type)
        })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Asset update failed.');
      return;
    }

    setStatusMessage('Asset updated successfully.');
    await loadAssets();
  };

  const handleDeleteAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const response = await apiRequest(
      `/assets/${deleteId}`,
      { method: 'DELETE' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Asset deletion failed.');
      return;
    }

    setStatusMessage('Asset deleted successfully.');
    setDeleteId('');
    await loadAssets();
  };

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const response = await apiRequest(
      `/assets/${lookupId}`,
      { method: 'GET' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Asset lookup failed.');
      return;
    }
    const payload = await response.json();
    const asset =
      (payload && typeof payload === 'object' && 'asset' in payload
        ? (payload as { asset?: AssetRecord }).asset
        : payload) ?? null;
    setLookupResult(asset as AssetRecord | null);
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFile) {
      setErrorMessage('Select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('files', uploadFile);

    const response = await apiRequest(
      `/assets/${uploadAssetId}/files`,
      {
        method: 'POST',
        body: formData
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('File upload failed.');
      return;
    }

    setStatusMessage('File uploaded successfully.');
    setUploadAssetId('');
    setUploadFile(null);
  };

  const handleDeleteFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await apiRequest(
      `/assets/${deleteFileAssetId}/files/${deleteFileId}`,
      { method: 'DELETE' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('File deletion failed.');
      return;
    }

    setStatusMessage('File deleted successfully.');
    setDeleteFileAssetId('');
    setDeleteFileId('');
  };

  return (
    <PageContainer
      pageTitle='Assets'
      pageDescription='Create, manage, and upload asset records.'
    >
      <div className='space-y-6'>
        {statusMessage ? (
          <p className='text-sm text-emerald-600'>{statusMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className='text-destructive text-sm'>{errorMessage}</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Asset List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className='text-muted-foreground text-sm'>Loading assets...</p>
            ) : assets.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id ?? asset.name}>
                      <TableCell className='font-mono text-xs'>
                        {asset.id ?? '—'}
                      </TableCell>
                      <TableCell>{asset.name ?? 'Untitled'}</TableCell>
                      <TableCell>{asset.type ?? '—'}</TableCell>
                      <TableCell>
                        {asset.tags?.length ? asset.tags.join(', ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className='text-muted-foreground text-sm'>No assets found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={handleCreateAsset}>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='create-name'>Name</Label>
                  <Input
                    id='create-name'
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder='Tabby Subscription'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-type'>Type</Label>
                  <Input
                    id='create-type'
                    value={createType}
                    onChange={(event) => setCreateType(event.target.value)}
                    placeholder='CREDENTIALS'
                    required
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-tags'>Tags</Label>
                <Input
                  id='create-tags'
                  value={createTags}
                  onChange={(event) => setCreateTags(event.target.value)}
                  placeholder='subscription, tabby'
                />
              </div>
              <div className='space-y-4'>
                <Label>Fields</Label>
                {createFields.map((field, index) => (
                  <div
                    className='grid gap-4 rounded-md border p-4 md:grid-cols-4'
                    key={`create-field-${index}`}
                  >
                    <Input
                      placeholder='Key'
                      value={field.key}
                      onChange={(event) =>
                        handleCreateFieldChange(
                          index,
                          'key',
                          event.target.value
                        )
                      }
                    />
                    <Input
                      placeholder='Type'
                      value={field.type}
                      onChange={(event) =>
                        handleCreateFieldChange(
                          index,
                          'type',
                          event.target.value
                        )
                      }
                    />
                    <Input
                      placeholder='Value'
                      value={field.value}
                      onChange={(event) =>
                        handleCreateFieldChange(
                          index,
                          'value',
                          event.target.value
                        )
                      }
                    />
                    <Input
                      placeholder='Secret? true/false'
                      value={field.isSecret ? 'true' : 'false'}
                      onChange={(event) =>
                        handleCreateFieldChange(
                          index,
                          'isSecret',
                          event.target.value === 'true'
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() =>
                    setCreateFields((prev) => [
                      ...prev,
                      { key: '', type: '', value: '' }
                    ])
                  }
                >
                  Add Field
                </Button>
              </div>
              <Button type='submit' className='w-full'>
                Create Asset
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={handleUpdateAsset}>
              <div className='space-y-2'>
                <Label htmlFor='update-id'>Asset ID</Label>
                <Input
                  id='update-id'
                  value={updateId}
                  onChange={(event) => setUpdateId(event.target.value)}
                  placeholder='assetId'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='update-name'>Name (optional)</Label>
                <Input
                  id='update-name'
                  value={updateName}
                  onChange={(event) => setUpdateName(event.target.value)}
                  placeholder='Tabby Subscription (updated)'
                />
              </div>
              <div className='space-y-4'>
                <Label>Fields</Label>
                {updateFields.map((field, index) => (
                  <div
                    className='grid gap-4 rounded-md border p-4 md:grid-cols-3'
                    key={`update-field-${index}`}
                  >
                    <Input
                      placeholder='Key'
                      value={field.key}
                      onChange={(event) =>
                        handleUpdateFieldChange(
                          index,
                          'key',
                          event.target.value
                        )
                      }
                    />
                    <Input
                      placeholder='Type'
                      value={field.type}
                      onChange={(event) =>
                        handleUpdateFieldChange(
                          index,
                          'type',
                          event.target.value
                        )
                      }
                    />
                    <Input
                      placeholder='Value'
                      value={field.value}
                      onChange={(event) =>
                        handleUpdateFieldChange(
                          index,
                          'value',
                          event.target.value
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() =>
                    setUpdateFields((prev) => [
                      ...prev,
                      { key: '', type: '', value: '' }
                    ])
                  }
                >
                  Add Field
                </Button>
              </div>
              <Button type='submit' className='w-full'>
                Update Asset
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Lookup Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleLookup}>
                <div className='space-y-2'>
                  <Label htmlFor='lookup-id'>Asset ID</Label>
                  <Input
                    id='lookup-id'
                    value={lookupId}
                    onChange={(event) => setLookupId(event.target.value)}
                    placeholder='assetId'
                    required
                  />
                </div>
                <Button type='submit' className='w-full'>
                  Fetch Asset
                </Button>
                {lookupResult ? (
                  <Textarea
                    className='mt-4 font-mono text-xs'
                    rows={6}
                    value={JSON.stringify(lookupResult, null, 2)}
                    readOnly
                  />
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delete Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleDeleteAsset}>
                <div className='space-y-2'>
                  <Label htmlFor='delete-id'>Asset ID</Label>
                  <Input
                    id='delete-id'
                    value={deleteId}
                    onChange={(event) => setDeleteId(event.target.value)}
                    placeholder='assetId'
                    required
                  />
                </div>
                <Button type='submit' variant='destructive' className='w-full'>
                  Delete Asset
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Upload Asset Files</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleUpload}>
                <div className='space-y-2'>
                  <Label htmlFor='upload-asset-id'>Asset ID</Label>
                  <Input
                    id='upload-asset-id'
                    value={uploadAssetId}
                    onChange={(event) => setUploadAssetId(event.target.value)}
                    placeholder='assetId'
                    required
                  />
                </div>
                <Input
                  type='file'
                  onChange={(event) =>
                    setUploadFile(event.target.files?.[0] ?? null)
                  }
                />
                <Button type='submit' className='w-full'>
                  Upload File
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delete Asset File</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleDeleteFile}>
                <div className='space-y-2'>
                  <Label htmlFor='delete-file-asset-id'>Asset ID</Label>
                  <Input
                    id='delete-file-asset-id'
                    value={deleteFileAssetId}
                    onChange={(event) =>
                      setDeleteFileAssetId(event.target.value)
                    }
                    placeholder='assetId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='delete-file-id'>File ID</Label>
                  <Input
                    id='delete-file-id'
                    value={deleteFileId}
                    onChange={(event) => setDeleteFileId(event.target.value)}
                    placeholder='fileId'
                    required
                  />
                </div>
                <Button type='submit' variant='destructive' className='w-full'>
                  Delete File
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
