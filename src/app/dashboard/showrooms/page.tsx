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

type ShowroomMetaField = {
  key: string;
  value: string;
};

type ShowroomTemplateSize = {
  label: string;
  width: string;
  height: string;
  unit: string;
};

type ShowroomTemplate = {
  name: string;
  description: string;
  sizes: ShowroomTemplateSize[];
};

type ShowroomRecord = {
  id?: string;
  name?: string;
  location?: string;
  metaFields?: ShowroomMetaField[];
  templates?: ShowroomTemplate[];
};

type ShowroomAssetRecord = {
  id?: string;
  name?: string;
  type?: string;
  fields?: { key: string; type: string; value: string }[];
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

export default function ShowroomsPage() {
  const [showrooms, setShowrooms] = useState<ShowroomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [createName, setCreateName] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createMetaFields, setCreateMetaFields] = useState<ShowroomMetaField[]>(
    [{ key: '', value: '' }]
  );
  const [createTemplates, setCreateTemplates] = useState<ShowroomTemplate[]>([
    {
      name: '',
      description: '',
      sizes: [{ label: '', width: '', height: '', unit: 'px' }]
    }
  ]);

  const [updateId, setUpdateId] = useState('');
  const [updateLocation, setUpdateLocation] = useState('');

  const [deleteId, setDeleteId] = useState('');

  const [templateShowroomId, setTemplateShowroomId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateSizes, setTemplateSizes] = useState<ShowroomTemplateSize[]>([
    { label: '', width: '', height: '', unit: 'px' }
  ]);
  const [templateId, setTemplateId] = useState('');
  const [templateUpdateDescription, setTemplateUpdateDescription] =
    useState('');
  const [templateDeleteId, setTemplateDeleteId] = useState('');

  const [assetShowroomId, setAssetShowroomId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [assetFields, setAssetFields] = useState([
    { key: '', type: '', value: '' }
  ]);

  const [showroomAssets, setShowroomAssets] = useState<ShowroomAssetRecord[]>(
    []
  );
  const [assetsShowroomId, setAssetsShowroomId] = useState('');

  const [showroomAssetId, setShowroomAssetId] = useState('');
  const [showroomAssetUpdateName, setShowroomAssetUpdateName] = useState('');
  const [showroomAssetUpdateFields, setShowroomAssetUpdateFields] = useState([
    { key: '', type: '', value: '' }
  ]);

  const [uploadShowroomId, setUploadShowroomId] = useState('');
  const [uploadShowroomAssetId, setUploadShowroomAssetId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [deleteShowroomAssetId, setDeleteShowroomAssetId] = useState('');
  const [deleteShowroomId, setDeleteShowroomId] = useState('');

  const [deleteFileShowroomId, setDeleteFileShowroomId] = useState('');
  const [deleteFileShowroomAssetId, setDeleteFileShowroomAssetId] =
    useState('');
  const [deleteFileId, setDeleteFileId] = useState('');

  const [lookupShowroomId, setLookupShowroomId] = useState('');
  const [lookupResult, setLookupResult] = useState<ShowroomRecord | null>(null);

  const loadShowrooms = async () => {
    setLoading(true);
    const response = await apiRequest(
      '/showrooms',
      { method: 'GET' },
      { auth: true }
    );
    if (!response.ok) {
      setErrorMessage('Failed to load showrooms.');
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setShowrooms(normalizeList(payload, 'showrooms') as ShowroomRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadShowrooms().catch(() => {
      setErrorMessage('Failed to load showrooms.');
      setLoading(false);
    });
  }, []);

  const handleCreateShowroom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const response = await apiRequest(
      '/showrooms',
      {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          location: createLocation,
          metaFields: createMetaFields.filter((field) => field.key),
          templates: createTemplates.filter((template) => template.name)
        })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom creation failed.');
      return;
    }

    setStatusMessage('Showroom created successfully.');
    setCreateName('');
    setCreateLocation('');
    setCreateMetaFields([{ key: '', value: '' }]);
    setCreateTemplates([
      {
        name: '',
        description: '',
        sizes: [{ label: '', width: '', height: '', unit: 'px' }]
      }
    ]);
    await loadShowrooms();
  };

  const handleUpdateShowroom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const response = await apiRequest(
      `/showrooms/${updateId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ location: updateLocation })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom update failed.');
      return;
    }

    setStatusMessage('Showroom updated successfully.');
    await loadShowrooms();
  };

  const handleDeleteShowroom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${deleteId}`,
      { method: 'DELETE' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom deletion failed.');
      return;
    }

    setStatusMessage('Showroom deleted successfully.');
    setDeleteId('');
    await loadShowrooms();
  };

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${lookupShowroomId}`,
      { method: 'GET' },
      { auth: true }
    );
    if (!response.ok) {
      setErrorMessage('Showroom lookup failed.');
      return;
    }
    const payload = await response.json();
    const showroom =
      (payload && typeof payload === 'object' && 'showroom' in payload
        ? (payload as { showroom?: ShowroomRecord }).showroom
        : payload) ?? null;
    setLookupResult(showroom as ShowroomRecord | null);
  };

  const handleAddTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${templateShowroomId}/templates`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          sizes: templateSizes.map((size) => ({
            label: size.label,
            width: Number(size.width),
            height: Number(size.height),
            unit: size.unit
          }))
        })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Template creation failed.');
      return;
    }

    setStatusMessage('Template added successfully.');
    setTemplateName('');
    setTemplateDescription('');
    setTemplateSizes([{ label: '', width: '', height: '', unit: 'px' }]);
  };

  const handleUpdateTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${templateShowroomId}/templates/${templateId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ description: templateUpdateDescription })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Template update failed.');
      return;
    }

    setStatusMessage('Template updated successfully.');
    setTemplateUpdateDescription('');
  };

  const handleDeleteTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${templateShowroomId}/templates/${templateDeleteId}`,
      { method: 'DELETE' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Template deletion failed.');
      return;
    }

    setStatusMessage('Template deleted successfully.');
    setTemplateDeleteId('');
  };

  const handleCreateShowroomAsset = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${assetShowroomId}/assets`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: assetName,
          type: assetType,
          fields: assetFields.filter((field) => field.key)
        })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom asset creation failed.');
      return;
    }

    setStatusMessage('Showroom asset created successfully.');
    setAssetName('');
    setAssetType('');
    setAssetFields([{ key: '', type: '', value: '' }]);
  };

  const handleListShowroomAssets = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${assetsShowroomId}/assets`,
      { method: 'GET' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Failed to load showroom assets.');
      return;
    }

    const payload = await response.json();
    setShowroomAssets(
      normalizeList(payload, 'assets') as ShowroomAssetRecord[]
    );
  };

  const handleUpdateShowroomAsset = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${uploadShowroomId}/assets/${showroomAssetId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: showroomAssetUpdateName,
          fields: showroomAssetUpdateFields.filter((field) => field.key)
        })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom asset update failed.');
      return;
    }

    setStatusMessage('Showroom asset updated successfully.');
  };

  const handleUploadShowroomAssetFile = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!uploadFile) {
      setErrorMessage('Select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('files', uploadFile);

    const response = await apiRequest(
      `/showrooms/${uploadShowroomId}/assets/${uploadShowroomAssetId}/files`,
      {
        method: 'POST',
        body: formData
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom asset upload failed.');
      return;
    }

    setStatusMessage('Showroom asset file uploaded successfully.');
    setUploadFile(null);
  };

  const handleDeleteShowroomAsset = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${deleteShowroomId}/assets/${deleteShowroomAssetId}`,
      { method: 'DELETE' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom asset deletion failed.');
      return;
    }

    setStatusMessage('Showroom asset deleted successfully.');
    setDeleteShowroomAssetId('');
  };

  const handleDeleteShowroomAssetFile = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const response = await apiRequest(
      `/showrooms/${deleteFileShowroomId}/assets/${deleteFileShowroomAssetId}/files/${deleteFileId}`,
      { method: 'DELETE' },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Showroom asset file deletion failed.');
      return;
    }

    setStatusMessage('Showroom asset file deleted successfully.');
    setDeleteFileId('');
  };

  return (
    <PageContainer
      pageTitle='Showrooms'
      pageDescription='Manage showroom locations, templates, and showroom assets.'
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
            <CardTitle>Showroom List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className='text-muted-foreground text-sm'>
                Loading showrooms...
              </p>
            ) : showrooms.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showrooms.map((showroom) => (
                    <TableRow key={showroom.id ?? showroom.name}>
                      <TableCell className='font-mono text-xs'>
                        {showroom.id ?? '—'}
                      </TableCell>
                      <TableCell>{showroom.name ?? 'Untitled'}</TableCell>
                      <TableCell>{showroom.location ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className='text-muted-foreground text-sm'>
                No showrooms found.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Showroom</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={handleCreateShowroom}>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='create-showroom-name'>Name</Label>
                  <Input
                    id='create-showroom-name'
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder='Riyadh Flagship'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-showroom-location'>Location</Label>
                  <Input
                    id='create-showroom-location'
                    value={createLocation}
                    onChange={(event) => setCreateLocation(event.target.value)}
                    placeholder='Riyadh'
                    required
                  />
                </div>
              </div>
              <div className='space-y-4'>
                <Label>Meta Fields</Label>
                {createMetaFields.map((field, index) => (
                  <div
                    className='grid gap-4 rounded-md border p-4 md:grid-cols-2'
                    key={`meta-${index}`}
                  >
                    <Input
                      placeholder='Key'
                      value={field.key}
                      onChange={(event) =>
                        setCreateMetaFields((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, key: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                    <Input
                      placeholder='Value'
                      value={field.value}
                      onChange={(event) =>
                        setCreateMetaFields((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, value: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() =>
                    setCreateMetaFields((prev) => [
                      ...prev,
                      { key: '', value: '' }
                    ])
                  }
                >
                  Add Meta Field
                </Button>
              </div>
              <div className='space-y-4'>
                <Label>Templates</Label>
                {createTemplates.map((template, index) => (
                  <div className='space-y-3 rounded-md border p-4' key={index}>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <Input
                        placeholder='Template Name'
                        value={template.name}
                        onChange={(event) =>
                          setCreateTemplates((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, name: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Description'
                        value={template.description}
                        onChange={(event) =>
                          setCreateTemplates((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, description: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                    {template.sizes.map((size, sizeIndex) => (
                      <div
                        className='grid gap-4 md:grid-cols-4'
                        key={`template-size-${sizeIndex}`}
                      >
                        <Input
                          placeholder='Label'
                          value={size.label}
                          onChange={(event) =>
                            setCreateTemplates((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      sizes: item.sizes.map((s, j) =>
                                        j === sizeIndex
                                          ? { ...s, label: event.target.value }
                                          : s
                                      )
                                    }
                                  : item
                              )
                            )
                          }
                        />
                        <Input
                          placeholder='Width'
                          value={size.width}
                          onChange={(event) =>
                            setCreateTemplates((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      sizes: item.sizes.map((s, j) =>
                                        j === sizeIndex
                                          ? { ...s, width: event.target.value }
                                          : s
                                      )
                                    }
                                  : item
                              )
                            )
                          }
                        />
                        <Input
                          placeholder='Height'
                          value={size.height}
                          onChange={(event) =>
                            setCreateTemplates((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      sizes: item.sizes.map((s, j) =>
                                        j === sizeIndex
                                          ? { ...s, height: event.target.value }
                                          : s
                                      )
                                    }
                                  : item
                              )
                            )
                          }
                        />
                        <Input
                          placeholder='Unit'
                          value={size.unit}
                          onChange={(event) =>
                            setCreateTemplates((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      sizes: item.sizes.map((s, j) =>
                                        j === sizeIndex
                                          ? { ...s, unit: event.target.value }
                                          : s
                                      )
                                    }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                    ))}
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        setCreateTemplates((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  sizes: [
                                    ...item.sizes,
                                    {
                                      label: '',
                                      width: '',
                                      height: '',
                                      unit: 'px'
                                    }
                                  ]
                                }
                              : item
                          )
                        )
                      }
                    >
                      Add Size
                    </Button>
                  </div>
                ))}
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() =>
                    setCreateTemplates((prev) => [
                      ...prev,
                      {
                        name: '',
                        description: '',
                        sizes: [
                          { label: '', width: '', height: '', unit: 'px' }
                        ]
                      }
                    ])
                  }
                >
                  Add Template
                </Button>
              </div>
              <Button type='submit' className='w-full'>
                Create Showroom
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Update Showroom</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleUpdateShowroom}>
                <div className='space-y-2'>
                  <Label htmlFor='update-showroom-id'>Showroom ID</Label>
                  <Input
                    id='update-showroom-id'
                    value={updateId}
                    onChange={(event) => setUpdateId(event.target.value)}
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='update-showroom-location'>Location</Label>
                  <Input
                    id='update-showroom-location'
                    value={updateLocation}
                    onChange={(event) => setUpdateLocation(event.target.value)}
                    placeholder='Riyadh - Main'
                    required
                  />
                </div>
                <Button type='submit' className='w-full'>
                  Update Showroom
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delete Showroom</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleDeleteShowroom}>
                <div className='space-y-2'>
                  <Label htmlFor='delete-showroom-id'>Showroom ID</Label>
                  <Input
                    id='delete-showroom-id'
                    value={deleteId}
                    onChange={(event) => setDeleteId(event.target.value)}
                    placeholder='showroomId'
                    required
                  />
                </div>
                <Button type='submit' variant='destructive' className='w-full'>
                  Delete Showroom
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lookup Showroom</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={handleLookup}>
              <div className='space-y-2'>
                <Label htmlFor='lookup-showroom-id'>Showroom ID</Label>
                <Input
                  id='lookup-showroom-id'
                  value={lookupShowroomId}
                  onChange={(event) => setLookupShowroomId(event.target.value)}
                  placeholder='showroomId'
                  required
                />
              </div>
              <Button type='submit' className='w-full'>
                Fetch Showroom
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

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Add Template</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleAddTemplate}>
                <div className='space-y-2'>
                  <Label htmlFor='template-showroom-id'>Showroom ID</Label>
                  <Input
                    id='template-showroom-id'
                    value={templateShowroomId}
                    onChange={(event) =>
                      setTemplateShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='template-name'>Template Name</Label>
                  <Input
                    id='template-name'
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder='Banner'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='template-description'>Description</Label>
                  <Input
                    id='template-description'
                    value={templateDescription}
                    onChange={(event) =>
                      setTemplateDescription(event.target.value)
                    }
                    placeholder='Main banner sizes'
                    required
                  />
                </div>
                <div className='space-y-4'>
                  <Label>Sizes</Label>
                  {templateSizes.map((size, index) => (
                    <div className='grid gap-4 md:grid-cols-4' key={index}>
                      <Input
                        placeholder='Label'
                        value={size.label}
                        onChange={(event) =>
                          setTemplateSizes((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, label: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Width'
                        value={size.width}
                        onChange={(event) =>
                          setTemplateSizes((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, width: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Height'
                        value={size.height}
                        onChange={(event) =>
                          setTemplateSizes((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, height: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Unit'
                        value={size.unit}
                        onChange={(event) =>
                          setTemplateSizes((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, unit: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() =>
                      setTemplateSizes((prev) => [
                        ...prev,
                        { label: '', width: '', height: '', unit: 'px' }
                      ])
                    }
                  >
                    Add Size
                  </Button>
                </div>
                <Button type='submit' className='w-full'>
                  Add Template
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Update Template</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleUpdateTemplate}>
                <div className='space-y-2'>
                  <Label htmlFor='template-update-showroom-id'>
                    Showroom ID
                  </Label>
                  <Input
                    id='template-update-showroom-id'
                    value={templateShowroomId}
                    onChange={(event) =>
                      setTemplateShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='template-id'>Template ID</Label>
                  <Input
                    id='template-id'
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    placeholder='templateId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='template-update-description'>
                    Description
                  </Label>
                  <Input
                    id='template-update-description'
                    value={templateUpdateDescription}
                    onChange={(event) =>
                      setTemplateUpdateDescription(event.target.value)
                    }
                    placeholder='Updated template description'
                    required
                  />
                </div>
                <Button type='submit' className='w-full'>
                  Update Template
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Delete Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={handleDeleteTemplate}>
              <div className='space-y-2'>
                <Label htmlFor='template-delete-showroom-id'>Showroom ID</Label>
                <Input
                  id='template-delete-showroom-id'
                  value={templateShowroomId}
                  onChange={(event) =>
                    setTemplateShowroomId(event.target.value)
                  }
                  placeholder='showroomId'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='template-delete-id'>Template ID</Label>
                <Input
                  id='template-delete-id'
                  value={templateDeleteId}
                  onChange={(event) => setTemplateDeleteId(event.target.value)}
                  placeholder='templateId'
                  required
                />
              </div>
              <Button type='submit' variant='destructive' className='w-full'>
                Delete Template
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Create Showroom Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleCreateShowroomAsset}>
                <div className='space-y-2'>
                  <Label htmlFor='asset-showroom-id'>Showroom ID</Label>
                  <Input
                    id='asset-showroom-id'
                    value={assetShowroomId}
                    onChange={(event) => setAssetShowroomId(event.target.value)}
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='asset-name'>Asset Name</Label>
                  <Input
                    id='asset-name'
                    value={assetName}
                    onChange={(event) => setAssetName(event.target.value)}
                    placeholder='Canva Design Link'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='asset-type'>Asset Type</Label>
                  <Input
                    id='asset-type'
                    value={assetType}
                    onChange={(event) => setAssetType(event.target.value)}
                    placeholder='LINKS'
                    required
                  />
                </div>
                <div className='space-y-4'>
                  <Label>Fields</Label>
                  {assetFields.map((field, index) => (
                    <div
                      className='grid gap-4 rounded-md border p-4 md:grid-cols-3'
                      key={index}
                    >
                      <Input
                        placeholder='Key'
                        value={field.key}
                        onChange={(event) =>
                          setAssetFields((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, key: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Type'
                        value={field.type}
                        onChange={(event) =>
                          setAssetFields((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, type: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Value'
                        value={field.value}
                        onChange={(event) =>
                          setAssetFields((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, value: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() =>
                      setAssetFields((prev) => [
                        ...prev,
                        { key: '', type: '', value: '' }
                      ])
                    }
                  >
                    Add Field
                  </Button>
                </div>
                <Button type='submit' className='w-full'>
                  Create Showroom Asset
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>List Showroom Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleListShowroomAssets}>
                <div className='space-y-2'>
                  <Label htmlFor='assets-showroom-id'>Showroom ID</Label>
                  <Input
                    id='assets-showroom-id'
                    value={assetsShowroomId}
                    onChange={(event) =>
                      setAssetsShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <Button type='submit' className='w-full'>
                  Fetch Showroom Assets
                </Button>
              </form>
              {showroomAssets.length ? (
                <Table className='mt-4'>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showroomAssets.map((asset) => (
                      <TableRow key={asset.id ?? asset.name}>
                        <TableCell className='font-mono text-xs'>
                          {asset.id ?? '—'}
                        </TableCell>
                        <TableCell>{asset.name ?? 'Untitled'}</TableCell>
                        <TableCell>{asset.type ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Update Showroom Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleUpdateShowroomAsset}>
                <div className='space-y-2'>
                  <Label htmlFor='update-showroom-asset-showroom-id'>
                    Showroom ID
                  </Label>
                  <Input
                    id='update-showroom-asset-showroom-id'
                    value={uploadShowroomId}
                    onChange={(event) =>
                      setUploadShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='update-showroom-asset-id'>Asset ID</Label>
                  <Input
                    id='update-showroom-asset-id'
                    value={showroomAssetId}
                    onChange={(event) => setShowroomAssetId(event.target.value)}
                    placeholder='showroomAssetId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='update-showroom-asset-name'>Name</Label>
                  <Input
                    id='update-showroom-asset-name'
                    value={showroomAssetUpdateName}
                    onChange={(event) =>
                      setShowroomAssetUpdateName(event.target.value)
                    }
                    placeholder='Canva Design Link (updated)'
                  />
                </div>
                <div className='space-y-4'>
                  <Label>Fields</Label>
                  {showroomAssetUpdateFields.map((field, index) => (
                    <div
                      className='grid gap-4 rounded-md border p-4 md:grid-cols-3'
                      key={index}
                    >
                      <Input
                        placeholder='Key'
                        value={field.key}
                        onChange={(event) =>
                          setShowroomAssetUpdateFields((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, key: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Type'
                        value={field.type}
                        onChange={(event) =>
                          setShowroomAssetUpdateFields((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, type: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder='Value'
                        value={field.value}
                        onChange={(event) =>
                          setShowroomAssetUpdateFields((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, value: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() =>
                      setShowroomAssetUpdateFields((prev) => [
                        ...prev,
                        { key: '', type: '', value: '' }
                      ])
                    }
                  >
                    Add Field
                  </Button>
                </div>
                <Button type='submit' className='w-full'>
                  Update Showroom Asset
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delete Showroom Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={handleDeleteShowroomAsset}>
                <div className='space-y-2'>
                  <Label htmlFor='delete-showroom-asset-showroom-id'>
                    Showroom ID
                  </Label>
                  <Input
                    id='delete-showroom-asset-showroom-id'
                    value={deleteShowroomId}
                    onChange={(event) =>
                      setDeleteShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='delete-showroom-asset-id'>Asset ID</Label>
                  <Input
                    id='delete-showroom-asset-id'
                    value={deleteShowroomAssetId}
                    onChange={(event) =>
                      setDeleteShowroomAssetId(event.target.value)
                    }
                    placeholder='showroomAssetId'
                    required
                  />
                </div>
                <Button type='submit' variant='destructive' className='w-full'>
                  Delete Showroom Asset
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Upload Showroom Asset File</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className='space-y-4'
                onSubmit={handleUploadShowroomAssetFile}
              >
                <div className='space-y-2'>
                  <Label htmlFor='upload-showroom-id'>Showroom ID</Label>
                  <Input
                    id='upload-showroom-id'
                    value={uploadShowroomId}
                    onChange={(event) =>
                      setUploadShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='upload-showroom-asset-id'>Asset ID</Label>
                  <Input
                    id='upload-showroom-asset-id'
                    value={uploadShowroomAssetId}
                    onChange={(event) =>
                      setUploadShowroomAssetId(event.target.value)
                    }
                    placeholder='showroomAssetId'
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
              <CardTitle>Delete Showroom Asset File</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className='space-y-4'
                onSubmit={handleDeleteShowroomAssetFile}
              >
                <div className='space-y-2'>
                  <Label htmlFor='delete-file-showroom-id'>Showroom ID</Label>
                  <Input
                    id='delete-file-showroom-id'
                    value={deleteFileShowroomId}
                    onChange={(event) =>
                      setDeleteFileShowroomId(event.target.value)
                    }
                    placeholder='showroomId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='delete-file-showroom-asset-id'>
                    Asset ID
                  </Label>
                  <Input
                    id='delete-file-showroom-asset-id'
                    value={deleteFileShowroomAssetId}
                    onChange={(event) =>
                      setDeleteFileShowroomAssetId(event.target.value)
                    }
                    placeholder='showroomAssetId'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='delete-file-id'>File ID</Label>
                  <Input
                    id='delete-file-id'
                    value={deleteFileId}
                    onChange={(event) => setDeleteFileId(event.target.value)}
                    placeholder='showroomFileId'
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
