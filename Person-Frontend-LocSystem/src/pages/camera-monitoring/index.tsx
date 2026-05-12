/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  Play,
  Pause,
  Camera,
  Settings,
  RefreshCw,
  AlertCircle,
  Save,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import CustomAlert from '../../hooks/useCustomAlert';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';
import { Topbar } from '../../components/layout/app-topbar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Card, CardContent } from '../../components/ui/card';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type PlateDetection = {
  id: string;
  plate: string;
  confidence: number;
  timestamp: string;
  cropImage: string;
  fullImage: string;
  vehicle?: {
    found: boolean;
    id?: string;
    model?: string;
    phone?: string;
    legalAdvisory?: {
      name: string;
      phone: string | null;
      document: string | null;
    };
    wallet?: {
      name: string;
    };
  };
};

type CameraConfig = {
  v_host: string;
  v_username: string;
  v_password: string;
  i_channel: number;
  b_enabled: boolean;
  bridgeHost: string;
};

type HistoryIncidence = {
  id: string;
  plate: string;
  confidence: number | null;
  positive: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'camera-monitoring-config';

// ─── Utilitários ─────────────────────────────────────────────────────────────

const PLATE_RE = /^[A-Z]{3}\d{1}[A-Z0-9]{1}\d{2}$/;

// ─── Tabela de histórico ──────────────────────────────────────────────────────

function HistoryTable() {
  const { data, isLoading, error } = useQuery<{
    incidences: HistoryIncidence[];
    total: number;
  }>({
    queryKey: ['camera-history'],
    queryFn: async () => {
      const res = await api.get('/camera-monitoring/history?limit=50&offset=0');
      return res.data;
    },
    throwOnError: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Carregando histórico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-900/20 p-3 text-sm text-white">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Erro ao carregar histórico.
      </div>
    );
  }

  if (!data || data.incidences.length === 0) {
    return (
      <div className="m-4 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800 p-3 text-sm text-white">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Nenhum registro de detecção encontrado.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <Table>
        <TableHeader className="sticky top-0 bg-zinc-900">
          <TableRow className="border-white/10 hover:bg-zinc-900">
            <TableHead className="text-white">#</TableHead>
            <TableHead className="text-white">Placa</TableHead>
            <TableHead className="text-white">Data e hora</TableHead>
            <TableHead className="text-white">Confiança</TableHead>
            <TableHead className="text-white">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.incidences.map((inc, idx) => (
            <TableRow key={inc.id} className="border-white/10 hover:bg-zinc-800">
              <TableCell className="text-gray-400">{idx + 1}</TableCell>
              <TableCell className="font-mono font-bold text-white">{inc.plate}</TableCell>
              <TableCell className="text-gray-300">
                {format(new Date(inc.createdAt), 'dd/MM/yyyy HH:mm')}
              </TableCell>
              <TableCell className="text-gray-300">
                {inc.confidence != null ? `${(inc.confidence * 100).toFixed(1)}%` : '—'}
              </TableCell>
              <TableCell>
                {inc.positive ? (
                  <Badge className="bg-green-600 text-white">Localizado</Badge>
                ) : (
                  <Badge className="bg-gray-600 text-white">Não encontrado</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

// ─── Modal de alerta de veículo ───────────────────────────────────────────────

function VehicleAlertDialog({
  open,
  onClose,
  detection,
}: {
  open: boolean;
  onClose: () => void;
  detection: PlateDetection | null;
}) {
  useEffect(() => {
    if (open) {
      const audio = new Audio('/alert.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [open]);

  if (!detection?.vehicle?.found) return null;

  const { vehicle, plate } = detection;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-zinc-700 bg-black text-white sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <span className="flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" style={{ animationDuration: '0.5s' }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" style={{ animationDuration: '0.5s', animationDelay: '0.25s' }} />
            </span>
            Veículo encontrado!
          </DialogTitle>
          <DialogDescription className="sr-only">
            Alerta de veículo encontrado no monitoramento de câmera
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <InfoRow label="Placa" value={plate} />
          {vehicle?.model && <InfoRow label="Modelo" value={vehicle.model} />}
          {vehicle?.wallet && <InfoRow label="Carteira" value={vehicle.wallet.name} />}
          {vehicle?.legalAdvisory && (
            <>
              <InfoRow label="Assessoria" value={vehicle.legalAdvisory.name} />
              {vehicle.legalAdvisory.phone && (
                <InfoRow label="Telefone" value={vehicle.legalAdvisory.phone} highlight />
              )}
            </>
          )}
          <div className="rounded-lg bg-yellow-900/30 p-3">
            <p className="text-xs font-medium text-yellow-200">⚠️ Atenção</p>
            <p className="mt-1 text-xs text-yellow-100">Entre em contato e verifique o status do contrato</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-red-500 bg-black text-white hover:bg-red-500/10 hover:text-white"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <p className="text-xs font-semibold text-zinc-400">{label}:</p>
      <p className={`text-sm font-medium ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CameraMonitoringPage() {
  const queryClient = useQueryClient();

  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [showSettings, setShowSettings] = useState(false);
  const [detections, setDetections] = useState<PlateDetection[]>([]);
  const [currentDetection, setCurrentDetection] = useState<PlateDetection | null>(null);
  const [alertVehicle, setAlertVehicle] = useState<PlateDetection | null>(null);
  const [showVehicleAlert, setShowVehicleAlert] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [config, setConfig] = useState<CameraConfig>({
    v_host: '',
    v_username: '',
    v_password: '',
    i_channel: 1,
    b_enabled: true,
    bridgeHost: 'localhost:3030',
  });
  const [alertInfo, setAlertInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const lastSearchedPlateRef = useRef<Map<string, number>>(new Map());
  const autoStartedRef = useRef(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Obter localização silenciosamente
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // Carregar config do localStorage e iniciar automaticamente
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CameraConfig;
        setConfig(parsed);
        if (!autoStartedRef.current && parsed.v_host && parsed.v_username && parsed.v_password) {
          autoStartedRef.current = true;
          setTimeout(() => startStreaming(parsed), 500);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => { stopStreaming(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Testar conexão ──────────────────────────────────────────────────────

  const testConnection = async () => {
    if (!config.v_host || !config.v_username || !config.v_password) {
      setTestStatus('error');
      setTestMessage('Preencha o IP, usuário e senha antes de testar.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `http://${config.bridgeHost}/camera?host=${encodeURIComponent(config.v_host)}&username=${encodeURIComponent(config.v_username)}&password=${encodeURIComponent(config.v_password)}&channel=${config.i_channel}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        // Aborta imediatamente — só queríamos confirmar que o bridge respondeu
        res.body?.cancel().catch(() => {});
        setTestStatus('success');
        setTestMessage('Conexão com o Camera Bridge estabelecida com sucesso!');
      } else {
        setTestStatus('error');
        setTestMessage(`Camera Bridge respondeu com erro ${res.status}.`);
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      setTestStatus('error');
      setTestMessage(isAbort ? 'Tempo esgotado — verifique se o Camera Bridge está rodando.' : 'Não foi possível conectar ao Camera Bridge.');
    }
  };

  // ─── Mutation: salvar config ─────────────────────────────────────────────

  const saveConfigMutation = useMutation({
    mutationFn: async (cfg: CameraConfig) => {
      const res = await api.post('/camera-monitoring/config', {
        v_host:     cfg.v_host,
        v_username: cfg.v_username,
        v_password: cfg.v_password,
        i_channel:  cfg.i_channel,
        b_enabled:  cfg.b_enabled,
      });
      return res.data;
    },
    onSuccess: () => {
      setAlertInfo({ message: 'Configuração salva com sucesso', type: 'success' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setShowSettings(false);
    },
    onError: () => {
      setAlertInfo({ message: 'Erro ao salvar configuração', type: 'error' });
    },
  });

  // ─── Processamento de detecção ───────────────────────────────────────────

  const processDetection = async (detection: PlateDetection, cfg: CameraConfig) => {
    if (!PLATE_RE.test(detection.plate)) return;

    const now = Date.now();
    const DEBOUNCE = 120_000;
    const last = lastSearchedPlateRef.current.get(detection.plate);
    if (last && now - last < DEBOUNCE) return;
    lastSearchedPlateRef.current.set(detection.plate, now);

    setCurrentDetection(detection);
    setDetections((prev) => [detection, ...prev].slice(0, 20));

    try {
      // 1. Buscar veículo na API
      const searchRes = await api.get(`/camera-monitoring/search/${detection.plate}`);
      detection.vehicle = searchRes.data;

      // 2. Salvar incidência com imagem
      const formData = new FormData();
      formData.append('plate', detection.plate);
      formData.append('latitude', String(userLocation?.latitude ?? 0));
      formData.append('longitude', String(userLocation?.longitude ?? 0));
      formData.append('confidence', String(detection.confidence / 100));

      if (detection.cropImage) {
        const blob = await fetch(`data:image/jpeg;base64,${detection.cropImage}`).then((r) => r.blob());
        formData.append('image', blob, `plate_${detection.plate}_${Date.now()}.jpg`);
      }

      await api.post('/camera-monitoring/incidence', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['camera-history'] });

      if (detection.vehicle?.found) {
        setAlertVehicle(detection);
        setShowVehicleAlert(true);
      }
    } catch {}
  };

  // ─── Streaming ───────────────────────────────────────────────────────────

  const startStreaming = async (cfg?: CameraConfig) => {
    const activeConfig = cfg ?? config;

    if (!activeConfig.v_host || !activeConfig.v_username || !activeConfig.v_password) {
      setConnectionStatus('error');
      setShowSettings(true);
      return;
    }

    setConnectionStatus('connecting');
    setIsStreaming(true);

    try {
      const url = `http://${activeConfig.bridgeHost}/camera?host=${encodeURIComponent(activeConfig.v_host)}&username=${encodeURIComponent(activeConfig.v_username)}&password=${encodeURIComponent(activeConfig.v_password)}&channel=${activeConfig.i_channel}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro ${response.status}`);

      setConnectionStatus('connected');
      setAlertInfo({ message: 'Conectado! Aguardando detecções...', type: 'success' });

      const reader = response.body!.getReader();
      readerRef.current = reader;

      const JPEG_START = new Uint8Array([0xff, 0xd8]);
      const JPEG_END   = new Uint8Array([0xff, 0xd9]);

      const findPattern = (arr: Uint8Array, pat: Uint8Array, start = 0): number => {
        for (let i = start; i <= arr.length - pat.length; i++) {
          if (arr.subarray(i, i + pat.length).every((b, j) => b === pat[j])) return i;
        }
        return -1;
      };

      let buffer = new Uint8Array(0);
      let eventData: { plate?: string; confidence?: number; fullImage?: string; cropImage?: string } = {};
      let imageCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const next = new Uint8Array(buffer.length + value.length);
        next.set(buffer);
        next.set(value, buffer.length);
        buffer = next;

        const text = new TextDecoder('latin1').decode(buffer);

        const plateMatch = text.match(/PlateNumber=([^\r\n]+)/);
        if (plateMatch) eventData.plate = plateMatch[1];

        const confMatch = text.match(/Confidence=([0-9.]+)/);
        if (confMatch) {
          const raw = parseFloat(confMatch[1]);
          eventData.confidence = raw > 100 ? (raw / 255) * 100 : raw;
        }

        let si = findPattern(buffer, JPEG_START);
        while (si !== -1) {
          const ei = findPattern(buffer, JPEG_END, si + 2);
          if (ei === -1) break;

          const jpeg = buffer.slice(si, ei + 2);
          let bin = '';
          for (let i = 0; i < jpeg.length; i += 8192) {
            bin += String.fromCharCode(...jpeg.slice(i, i + 8192));
          }
          const b64 = btoa(bin);

          imageCount++;
          if (imageCount === 1) {
            eventData.fullImage = b64;
          } else if (imageCount === 2) {
            eventData.cropImage = b64;
            const det: PlateDetection = {
              id:         Date.now().toString(),
              timestamp:  new Date().toISOString(),
              plate:      eventData.plate ?? 'DESCONHECIDA',
              confidence: eventData.confidence ?? 0,
              fullImage:  eventData.fullImage ?? '',
              cropImage:  eventData.cropImage ?? '',
            };
            await processDetection(det, activeConfig);
            eventData  = {};
            imageCount = 0;
          }

          buffer = buffer.slice(ei + 2);
          si = findPattern(buffer, JPEG_START);
        }

        if (buffer.length > 10 * 1024 * 1024) buffer = new Uint8Array(0);
      }
    } catch {
      setConnectionStatus('error');
      setIsStreaming(false);
      setAlertInfo({ message: 'Erro ao conectar com a câmera', type: 'error' });
    }
  };

  const stopStreaming = () => {
    readerRef.current?.cancel().catch(() => {});
    readerRef.current = null;
    lastSearchedPlateRef.current.clear();
    setIsStreaming(false);
    setConnectionStatus('disconnected');
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const statusDot: Record<string, string> = {
    connected:    'bg-green-500',
    connecting:   'bg-yellow-500',
    error:        'bg-red-500',
    disconnected: 'bg-red-600',
  };

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Monitoramento de Câmera' }]} />

      <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-hidden bg-black p-6 text-white">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Monitoramento</h1>

          <div className="flex items-center gap-2">
            {(!isStreaming || connectionStatus === 'error') && (
              <Button size="sm" variant="success" onClick={() => startStreaming()}>
                <Play className="mr-2 h-4 w-4" /> Iniciar
              </Button>
            )}
            {isStreaming && connectionStatus !== 'error' && (
              <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={stopStreaming}>
                <Pause className="mr-2 h-4 w-4" /> Parar
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className="border-white/30 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Stream de vídeo + última detecção */}
          <div className="flex min-h-0 flex-[2] flex-col gap-4">
            {/* Stream */}
            <Card className="flex-[2] border-white/10 bg-zinc-900">
              <CardContent className="relative flex h-full items-center justify-center p-2.5">
                {/* Indicador de status */}
                <div className="absolute left-3 top-3 z-10">
                  <div className="relative flex h-3 w-3">
                    {connectionStatus === 'connected' && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${statusDot[connectionStatus]}`} />
                  </div>
                </div>

                {isStreaming && config.v_host && config.v_username && config.v_password ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`http://${config.bridgeHost}/video?host=${encodeURIComponent(config.v_host)}&username=${encodeURIComponent(config.v_username)}&password=${encodeURIComponent(config.v_password)}&channel=${config.i_channel}`}
                    alt="Stream de vídeo ao vivo"
                    className="h-full w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="text-center text-white">
                    <Camera className="mx-auto mb-2 h-12 w-12 opacity-40" />
                    <p className="text-sm opacity-60">
                      {isStreaming ? 'Aguardando conexão...' : 'Monitoramento pausado'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Última detecção de placa */}
            {currentDetection && (
              <Card className="border-white/10 bg-zinc-900">
                <CardContent className="flex items-center gap-4 p-3">
                  {currentDetection.cropImage && (
                    <img
                      src={`data:image/jpeg;base64,${currentDetection.cropImage}`}
                      alt="Placa detectada"
                      className="h-16 w-32 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-mono text-xl font-bold text-white">{currentDetection.plate}</p>
                    <p className="text-xs text-zinc-400">
                      Confiança: {currentDetection.confidence.toFixed(1)}% · {format(new Date(currentDetection.timestamp), 'HH:mm:ss')}
                    </p>
                  </div>
                  <div className="ml-auto">
                    {currentDetection.vehicle?.found ? (
                      <Badge className="bg-green-600 text-white">Localizado</Badge>
                    ) : currentDetection.vehicle ? (
                      <Badge className="bg-gray-600 text-white">Não encontrado</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Painel direito: detecções recentes + histórico */}
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Detecções recentes da sessão */}
            <Card className="min-h-0 flex-1 border-white/10 bg-zinc-900">
              <div className="border-b border-white/10 px-4 py-2">
                <p className="text-sm font-semibold text-white">Detecções recentes</p>
              </div>
              <ScrollArea className="h-[calc(100%-40px)]">
                {detections.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 text-xs text-zinc-400">
                    <AlertCircle className="h-4 w-4" />
                    Nenhuma detecção nesta sessão
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {detections.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 px-4 py-2">
                        {d.cropImage && (
                          <img src={`data:image/jpeg;base64,${d.cropImage}`} alt="" className="h-8 w-14 rounded object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-bold text-white">{d.plate}</p>
                          <p className="text-xs text-zinc-400">{format(new Date(d.timestamp), 'HH:mm:ss')}</p>
                        </div>
                        {d.vehicle?.found ? (
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                        ) : d.vehicle ? (
                          <span className="h-2 w-2 rounded-full bg-zinc-500" />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </Card>

            {/* Histórico persistido */}
            <Card className="min-h-0 flex-1 border-white/10 bg-zinc-900">
              <div className="border-b border-white/10 px-4 py-2">
                <p className="text-sm font-semibold text-white">Histórico de detecções</p>
              </div>
              <HistoryTable />
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de alerta de veículo */}
      <VehicleAlertDialog
        open={showVehicleAlert}
        onClose={() => setShowVehicleAlert(false)}
        detection={alertVehicle}
      />

      {/* Alerta CustomAlert global */}
      {alertInfo && (
        <div className="fixed top-4 right-4 z-[9999]">
          <CustomAlert
            message={alertInfo.message}
            type={alertInfo.type}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}

      {/* Modal de configurações */}
      <Dialog open={showSettings} onOpenChange={(open) => {
        setShowSettings(open);
        if (!open) {
          setTestStatus('idle');
          setTestMessage('');
        }
      }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Configuração da Câmera</DialogTitle>
            <DialogDescription>
              Configure as credenciais da câmera Intelbras e o endereço do Camera Bridge local.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="v_host">Endereço IP da câmera</Label>
              <Input
                id="v_host"
                placeholder="192.168.0.100"
                value={config.v_host}
                maxLength={50}
                pattern={"^([a-zA-Z0-9.-]+|((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$"}
                onChange={e => {
                  // Permite apenas letras, números, ponto, hífen
                  const val = e.target.value.replace(/[^a-zA-Z0-9.\-]/g, '');
                  setConfig({ ...config, v_host: val });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v_username">Usuário</Label>
              <Input
                id="v_username"
                placeholder="admin"
                value={config.v_username}
                maxLength={32}
                onChange={e => {
                  // Permite apenas letras, números e underline
                  const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                  setConfig({ ...config, v_username: val });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v_password">Senha</Label>
              <Input
                id="v_password"
                type="password"
                value={config.v_password}
                maxLength={32}
                onChange={e => {
                  // Permite qualquer caractere, mas limita tamanho
                  setConfig({ ...config, v_password: e.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i_channel">Canal</Label>
              <Input
                id="i_channel"
                type="number"
                min={1}
                max={16}
                value={config.i_channel}
                onChange={e => {
                  // Permite apenas números entre 1 e 16
                  let val = parseInt(e.target.value.replace(/[^0-9]/g, ''));
                  if (isNaN(val) || val < 1) val = 1;
                  if (val > 16) val = 16;
                  setConfig({ ...config, i_channel: val });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bridgeHost">IP do Camera Bridge</Label>
              <Input
                id="bridgeHost"
                placeholder="localhost:3030"
                value={config.bridgeHost}
                maxLength={50}
                onChange={e => {
                  // Permite letras, números, ponto, hífen, dois-pontos
                  const val = e.target.value.replace(/[^a-zA-Z0-9.\-:]/g, '');
                  setConfig({ ...config, bridgeHost: val });
                }}
              />
                    {/* Alerta CustomAlert */}
                    {alertInfo && (
                      <div className="fixed top-4 right-4 z-[9999]">
                        <CustomAlert
                          message={alertInfo.message}
                          type={alertInfo.type}
                          onClose={() => setAlertInfo(null)}
                        />
                      </div>
                    )}
              <p className="text-xs text-muted-foreground">Endereço do servidor local rodando no PC da câmera</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="b_enabled"
                checked={config.b_enabled}
                onCheckedChange={(checked) => { setConfig({ ...config, b_enabled: checked }); setTestStatus('idle'); }}
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-zinc-700 border-zinc-600"
              />
              <Label htmlFor="b_enabled" className="text-white select-none cursor-pointer">Câmera ativada</Label>
            </div>

            {/* Resultado do teste de conexão */}
            {testStatus !== 'idle' && (
              <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                testStatus === 'testing' ? 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300' :
                testStatus === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300' :
                'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
              }`}>
                {testStatus === 'testing' && <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
                {testStatus === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                {testStatus === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{testStatus === 'testing' ? 'Testando conexão...' : testMessage}</span>
              </div>
            )}
          </div>

          <DialogFooter className="">
            <Button
              variant="outline"
              onClick={() => {
                setShowSettings(false);
                setTestStatus('idle');
                setTestMessage('');
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testStatus === 'testing'}
              className="w-full sm:w-auto"
            >
              {testStatus === 'testing' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : testStatus === 'success' ? (
                <Wifi className="mr-2 h-4 w-4 text-green-600" />
              ) : testStatus === 'error' ? (
                <WifiOff className="mr-2 h-4 w-4 text-red-500" />
              ) : (
                <Wifi className="mr-2 h-4 w-4" />
              )}
              Testar Conexão
            </Button>
            <Button
              onClick={() => saveConfigMutation.mutate(config)}
              disabled={saveConfigMutation.isPending}
              variant="success"
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
