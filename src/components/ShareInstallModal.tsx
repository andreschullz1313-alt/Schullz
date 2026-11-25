import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  Camera,
  Check,
  Copy,
  Download,
  ImagePlus,
  QrCode,
  ScanLine,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWA_ICON_URI } from '../assets/studioMedia';
import { fmt, useLanguage } from '../i18n/LanguageContext';
import { checkApkAvailability, triggerDirectApkDownload } from '../services/apkService';
import { inspectForThreats, isSafeHttpUrl } from '../services/securityGuard';

interface ShareInstallPanelProps {
  couponCode: string;
  onToast: (msg: string) => void;
  logoUrl?: string;
  studioName?: string;
  apkDownloadUrl?: string;
  couponsUnlocked?: boolean;
  onGoToRegister?: () => void;
}

type ShareMode = 'link' | 'qr-share' | 'qr-scan';

export const ShareInstallPanel: React.FC<ShareInstallPanelProps> = ({
  couponCode,
  onToast,
  logoUrl,
  studioName = 'Schullz Ink Tattoo',
  apkDownloadUrl,
  couponsUnlocked = true,
  onGoToRegister,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { ui } = useLanguage();
  const [mode, setMode] = useState<ShareMode>('link');
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [apkStatus, setApkStatus] = useState<{ checked: boolean; available: boolean; url: string | null }>({
    checked: false,
    available: false,
    url: null,
  });
  const [downloadingApk, setDownloadingApk] = useState(false);
  const [apkNotice, setApkNotice] = useState<string | null>(null);

  // QR Share state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // QR Scanner state
  const [scanningCamera, setScanningCamera] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{
    url: string;
    refCode: string | null;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const guestShareUrl = useMemo(() => {
    const trimmed = customBaseUrl.trim();
    const rawBase =
      trimmed && isSafeHttpUrl(trimmed)
        ? trimmed
        : typeof window !== 'undefined'
        ? window.location.origin
        : '';
    const cleanBase = rawBase.replace(/\/+$/, '');
    const params = new URLSearchParams({
      instalar: '1',
    });
    if (couponsUnlocked && couponCode) {
      params.set('ref', couponCode);
    }
    return `${cleanBase}/?${params.toString()}`;
  }, [customBaseUrl, couponCode, couponsUnlocked]);

  // Generate QR Code data URL whenever guestShareUrl updates
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(guestShareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [guestShareUrl]);

  useEffect(() => {
    let active = true;
    void checkApkAvailability(apkDownloadUrl).then((res) => {
      if (active) {
        setApkStatus({ checked: true, available: res.available, url: res.url });
      }
    });
    return () => {
      active = false;
    };
  }, [apkDownloadUrl]);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanningCamera(false);
  };

  useEffect(() => {
    if (mode !== 'qr-scan') {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  const processScannedText = (rawText: string) => {
    const threat = inspectForThreats(rawText, 'Leitor de QR Code');
    if (!threat.safe) {
      setScanError('QR Code bloqueado por conter conteúdo potencialmente inseguro.');
      stopCamera();
      return;
    }
    if (!isSafeHttpUrl(rawText)) {
      setScanError('O QR Code lido não contém um link web válido (https://).');
      stopCamera();
      return;
    }
    try {
      const parsed = new URL(rawText.trim());
      const refCode = parsed.searchParams.get('ref');
      setScannedResult({
        url: parsed.toString(),
        refCode: refCode ? refCode.toUpperCase().slice(0, 32) : null,
      });
      setScanError(null);
      stopCamera();
      onToast('QR Code reconhecido com sucesso!');
    } catch {
      setScanError('Link de QR Code inválido.');
      stopCamera();
    }
  };

  const startCameraScan = async () => {
    setScanError(null);
    setScannedResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('Câmera não disponível neste navegador. Use a opção de ler QR Code de uma imagem.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setScanningCamera(true);

      const tick = () => {
        const video = videoRef.current;
        const canvas = scanCanvasRef.current;
        if (!video || !canvas || !streamRef.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code?.data) {
              processScannedText(code.data);
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          void videoRef.current.play().catch(() => {});
          rafRef.current = requestAnimationFrame(tick);
        }
      }, 60);
    } catch {
      setScanError('Permissão de câmera negada ou indisponível. Você pode enviar uma foto do QR Code.');
      stopCamera();
    }
  };

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    const objUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Falha ao abrir imagem.'));
        el.src = objUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height);
      if (!decoded?.data) {
        setScanError('Nenhum QR Code encontrado nesta imagem.');
        return;
      }
      processScannedText(decoded.data);
    } catch {
      setScanError('Não foi possível decodificar a imagem enviada.');
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  };

  const handleCopy = async () => {
    if (!couponsUnlocked) {
      onToast('Faça seu cadastro ou login abaixo para liberar e enviar cupons.');
      onGoToRegister?.();
      return;
    }
    try {
      await navigator.clipboard.writeText(guestShareUrl);
      setCopied(true);
      onToast(ui.share.toastCopied);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onToast(ui.share.toastManualCopy);
    }
  };

  const handleNativeShare = async () => {
    if (!couponsUnlocked) {
      onToast('Faça seu cadastro ou login para liberar e enviar convites com cupom.');
      onGoToRegister?.();
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: ui.share.shareTitle,
          text: fmt(ui.share.shareText, { code: couponCode }),
          url: guestShareUrl,
        });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    handleCopy();
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-app-${couponCode}.png`;
    a.click();
    onToast('QR Code baixado para compartilhar!');
  };

  const handleShareQrImage = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `schullz-ink-qr-${couponCode}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: studioName,
          text: `Escaneie o QR Code para baixar a versão mais recente do app ${studioName} com o cupom ${couponCode}!`,
          files: [file],
        });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
    handleDownloadQrPng();
  };

  const handleInstallSelf = async () => {
    setApkNotice(null);
    setDownloadingApk(true);
    try {
      const latest = await checkApkAvailability(apkDownloadUrl);
      setApkStatus({ checked: true, available: latest.available, url: latest.url });

      if (latest.available && latest.url) {
        await triggerDirectApkDownload(latest.url, 'SchullzInkTattoo.apk');
        onToast('Download direto de SchullzInkTattoo.apk iniciado no navegador!');
        return;
      }

      if (isInstallable) {
        const res = await install();
        if (res === 'accepted') {
          onToast(ui.share.toastInstalled);
          return;
        }
      }

      setApkNotice(
        'O arquivo APK assinado ainda não foi vinculado no servidor/Área do Artista. Enquanto isso, você pode instalar o aplicativo direto na tela inicial abaixo sem abrir nova aba.'
      );
      setShowGuide(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Não foi possível iniciar o download do APK.');
    } finally {
      setDownloadingApk(false);
    }
  };

  const whatsappInviteUrl = `https://wa.me/?text=${encodeURIComponent(
    fmt(ui.share.waInviteText, { url: guestShareUrl, code: couponCode })
  )}`;

  return (
    <div className="si-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--accent-gold)' }}>
            {ui.share.kicker}
          </div>
          <h3>{ui.share.title}</h3>
          {couponsUnlocked ? (
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              {ui.share.bodyBefore}{' '}
              <strong style={{ color: 'var(--r)' }}>{couponCode}</strong> {ui.share.bodyAfter}
            </p>
          ) : (
            <div
              className="p-3 rounded border space-y-2 mt-1"
              style={{ borderColor: 'var(--accent-gold)', background: 'var(--card-alt)' }}
            >
              <p className="text-sm font-semibold m-0" style={{ color: 'var(--text)' }}>
                Cadastre-se ou faça login na aba <strong>Indicação &amp; Cadastro</strong> para liberar seu cupom de 20% OFF, copiar seu código e enviar convites pelo WhatsApp ou QR Code.
              </p>
              {onGoToRegister && (
                <button type="button" className="si-btn si-btn-sm" onClick={onGoToRegister}>
                  Ir para Cadastro / Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher: Link | Compartilhar QR | Ler QR */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('link')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border text-sm font-bold uppercase tracking-wider cursor-pointer"
          style={{
            background: mode === 'link' ? 'var(--r)' : 'transparent',
            color: mode === 'link' ? 'var(--btn-text)' : 'var(--text)',
            borderColor: mode === 'link' ? 'var(--r)' : 'var(--border-strong)',
          }}
        >
          <Share2 size={15} />
          Link de convite
        </button>

        <button
          type="button"
          onClick={() => setMode('qr-share')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border text-sm font-bold uppercase tracking-wider cursor-pointer"
          style={{
            background: mode === 'qr-share' ? 'var(--r)' : 'transparent',
            color: mode === 'qr-share' ? 'var(--btn-text)' : 'var(--text)',
            borderColor: mode === 'qr-share' ? 'var(--r)' : 'var(--border-strong)',
          }}
        >
          <QrCode size={15} />
          Compartilhar QR Code
        </button>

        <button
          type="button"
          onClick={() => setMode('qr-scan')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border text-sm font-bold uppercase tracking-wider cursor-pointer"
          style={{
            background: mode === 'qr-scan' ? 'var(--r)' : 'transparent',
            color: mode === 'qr-scan' ? 'var(--btn-text)' : 'var(--text)',
            borderColor: mode === 'qr-scan' ? 'var(--r)' : 'var(--border-strong)',
          }}
        >
          <ScanLine size={15} />
          Ler QR Code
        </button>
      </div>

      {/* MODE 1: LINK */}
      {mode === 'link' && (
        <>
          {couponsUnlocked ? (
            <>
              <div className="space-y-2">
                <label htmlFor="guest-share-url" className="block font-semibold text-base">
                  {ui.share.linkLabel}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="guest-share-url"
                    type="url"
                    readOnly
                    value={guestShareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="si-input flex-1 font-mono text-sm"
                  />
                  <button type="button" onClick={handleCopy} className="si-btn shrink-0">
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? ui.share.linkCopiedBtn : ui.share.copyLinkBtn}
                  </button>
                </div>
              </div>

              <details className="text-sm" style={{ color: 'var(--text-muted)' }}>
                <summary className="cursor-pointer font-semibold py-1">
                  {ui.share.customDomainSummary}
                </summary>
                <div className="pt-2 space-y-1">
                  <input
                    type="url"
                    placeholder="https://seudominio.com.br"
                    value={customBaseUrl}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (inspectForThreats(v, 'Domínio personalizado').safe) {
                        setCustomBaseUrl(v);
                      }
                    }}
                    className="si-input text-sm"
                  />
                </div>
              </details>
            </>
          ) : null}

          <div className="flex flex-wrap gap-2.5 pt-1">
            {couponsUnlocked && (
              <>
                <a
                  href={whatsappInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="si-btn si-btn-sm"
                >
                  {ui.share.sendWaBtn}
                </a>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="si-btn si-btn-outline si-btn-sm"
                >
                  <Share2 size={16} />
                  {ui.share.shareLinkBtn}
                </button>
              </>
            )}

            {!isInstalled && (
              <button
                type="button"
                disabled={downloadingApk}
                onClick={handleInstallSelf}
                className="si-btn si-btn-sm"
              >
                <Download size={16} />
                {downloadingApk
                  ? 'Preparando APK...'
                  : apkStatus.available
                    ? 'Baixar APK neste aparelho'
                    : ui.share.installSelfBtn}
              </button>
            )}
          </div>

          {apkNotice && (
            <div
              className="p-3 rounded border text-sm"
              style={{ borderColor: 'var(--accent-gold)', background: 'var(--card-alt)', color: 'var(--text)' }}
            >
              {apkNotice}
            </div>
          )}
        </>
      )}

      {/* MODE 2: COMPARTILHAR QR CODE */}
      {mode === 'qr-share' && (
        <div
          className="p-4 rounded border flex flex-col sm:flex-row items-center gap-5"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
        >
          {!couponsUnlocked ? (
            <div className="space-y-2 text-center w-full py-2">
              <strong style={{ color: 'var(--accent-gold)' }}>
                QR Code com cupom bloqueado
              </strong>
              <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                Conclua seu cadastro ou faça login para gerar e enviar o QR Code com o seu cupom exclusivo de 20% OFF.
              </p>
              {onGoToRegister && (
                <button type="button" className="si-btn si-btn-sm" onClick={onGoToRegister}>
                  Ir para Cadastro / Login
                </button>
              )}
            </div>
          ) : (
            <>
              {qrDataUrl && (
                <div className="p-2.5 rounded-lg bg-white shrink-0 shadow">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code para baixar ${studioName}`}
                    className="w-44 h-44 block"
                  />
                </div>
              )}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={studioName}
                      className="w-7 h-7 rounded-full object-cover border"
                      style={{ borderColor: 'var(--r)' }}
                    />
                  )}
                  <strong style={{ color: 'var(--accent-gold)' }}>
                    Escaneie pela câmera para baixar na hora
                  </strong>
                </div>
                <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
                  Quem escanear este QR Code acessa diretamente a versão mais recente do aplicativo pela web com instalação automática e o cupom <strong>{couponCode}</strong>.
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <button type="button" onClick={handleShareQrImage} className="si-btn si-btn-sm">
                    <Share2 size={15} />
                    Compartilhar QR Code
                  </button>
                  <button type="button" onClick={handleDownloadQrPng} className="si-btn si-btn-outline si-btn-sm">
                    <Download size={15} />
                    Baixar PNG
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODE 3: LER QR CODE */}
      {mode === 'qr-scan' && (
        <div
          className="p-4 rounded border space-y-3"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
        >
          <div className="space-y-1">
            <strong style={{ color: 'var(--accent-gold)' }}>Leitor de QR Code Seguro</strong>
            <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
              Aponte a câmera para o QR Code de outro aparelho ou escolha uma imagem da galeria para baixar ou abrir o convite.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!scanningCamera ? (
              <button type="button" onClick={startCameraScan} className="si-btn si-btn-sm">
                <Camera size={15} />
                Abrir câmera para ler
              </button>
            ) : (
              <button type="button" onClick={stopCamera} className="si-btn si-btn-outline si-btn-sm">
                Parar câmera
              </button>
            )}

            <label className="si-btn si-btn-outline si-btn-sm cursor-pointer">
              <ImagePlus size={15} />
              Ler QR de uma imagem
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScanImageFile}
              />
            </label>
          </div>

          {scanningCamera && (
            <div className="relative rounded overflow-hidden border max-w-sm mx-auto" style={{ borderColor: 'var(--r)' }}>
              <video ref={videoRef} playsInline muted className="w-full block bg-black" />
              <canvas ref={scanCanvasRef} className="hidden" />
            </div>
          )}

          {scanError && (
            <div className="p-3 rounded border text-sm font-semibold" style={{ borderColor: 'var(--r)', color: 'var(--pain-ext-text)' }}>
              {scanError}
            </div>
          )}

          {scannedResult && (
            <div className="p-3 rounded border space-y-2" style={{ borderColor: 'var(--pain-low)', background: 'var(--card)' }}>
              <div className="font-bold text-sm" style={{ color: 'var(--pain-low-text)' }}>
                QR Code verificado e seguro:
              </div>
              <div className="font-mono text-xs break-all">{scannedResult.url}</div>
              {scannedResult.refCode && (
                <div className="text-sm">
                  Cupom detectado: <strong style={{ color: 'var(--r)' }}>{scannedResult.refCode}</strong>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={scannedResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="si-btn si-btn-sm"
                >
                  Abrir link do app
                </a>
                <button
                  type="button"
                  className="si-btn si-btn-outline si-btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(scannedResult.url).catch(() => {});
                    onToast('Link do QR Code copiado!');
                  }}
                >
                  Copiar link
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showGuide && !isInstalled && (
        <div
          className="p-4 rounded border space-y-2 text-base"
          style={{ borderColor: 'var(--accent-gold)', background: 'var(--card-alt)' }}
        >
          <strong style={{ color: 'var(--accent-gold)' }}>
            {isIOS ? ui.share.iosGuideTitle : ui.share.androidGuideTitle}
          </strong>
          {isIOS ? (
            <ol className="list-decimal list-inside space-y-1">
              {ui.share.iosSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-1">
              {ui.share.androidSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

interface GuestInstallModalProps {
  open: boolean;
  onClose: () => void;
  couponCode: string | null;
  onToast: (msg: string) => void;
  logoUrl?: string;
  studioName?: string;
  apkDownloadUrl?: string;
}

export const GuestInstallModal: React.FC<GuestInstallModalProps> = ({
  open,
  onClose,
  couponCode,
  onToast,
  logoUrl,
  studioName = 'Schullz Ink Tattoo',
  apkDownloadUrl,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { ui } = useLanguage();
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void checkApkAvailability(apkDownloadUrl).then((res) => {
      if (active) setApkUrl(res.available ? res.url : null);
    });
    return () => {
      active = false;
    };
  }, [open, apkDownloadUrl]);

  if (!open || isInstalled) return null;

  const handleInstallClick = async () => {
    if (apkUrl) {
      setDownloading(true);
      try {
        await triggerDirectApkDownload(apkUrl, 'SchullzInkTattoo.apk');
        onToast('Download direto de SchullzInkTattoo.apk iniciado!');
        return;
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Erro ao baixar APK.');
      } finally {
        setDownloading(false);
      }
    }

    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        onToast(ui.share.toastInstalled);
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label={ui.share.guestDialogAria}
    >
      <div className="si-card max-w-md w-full space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl || PWA_ICON_URI}
              alt={studioName}
              className="w-14 h-14 rounded-xl border object-cover"
              style={{ borderColor: 'var(--r)' }}
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
                {ui.share.guestInviteKicker}
              </div>
              <h3 className="text-2xl" style={{ color: 'var(--r)' }}>
                {studioName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label={ui.common.close}
            onClick={onClose}
            className="p-2 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text)' }}
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-base" style={{ color: 'var(--text)' }}>
          {ui.share.guestBody}
        </p>

        {couponCode && (
          <div
            className="p-3 rounded border text-base font-semibold"
            style={{ borderColor: 'var(--pain-low)', background: 'var(--card-alt)', color: 'var(--pain-low-text)' }}
          >
            {ui.share.guestCouponPrefix} <strong>{couponCode}</strong>
          </div>
        )}

        {apkUrl || isInstallable ? (
          <button
            type="button"
            disabled={downloading}
            className="si-btn w-full"
            onClick={handleInstallClick}
          >
            <Download size={20} />
            {downloading
              ? 'Baixando APK...'
              : apkUrl
                ? 'Baixar APK Direto no Celular'
                : ui.share.guestInstallBtn}
          </button>
        ) : (
          <div
            className="p-4 rounded border space-y-2 text-base"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--card-alt)' }}
          >
            <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--accent-gold)' }}>
              <Smartphone size={18} />
              {isIOS ? ui.share.guestIosTitle : ui.share.guestAndroidTitle}
            </div>
            {isIOS ? (
              <ol className="list-decimal list-inside space-y-1 text-sm sm:text-base">
                {ui.share.guestIosSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 text-sm sm:text-base">
                {ui.share.guestAndroidSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        <button type="button" className="si-btn si-btn-outline w-full" onClick={onClose}>
          {ui.share.guestContinueBtn}
        </button>
      </div>
    </div>
  );
};
