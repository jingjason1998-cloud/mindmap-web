import { useState } from 'react';
import { useMindMapStore } from '@/stores/mindMapStore';
import { Link2, Copy, Check, Share2, Download } from 'lucide-react';
import { exportToJSON, downloadJSON } from '@/utils/exportImport';
import QRCode from 'qrcode';

export function SharePanel() {
  const { name, rootNodeId, nodes, layout, generateShareLink } = useMindMapStore();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const handleGenerate = async () => {
    const url = generateShareLink();
    setShareUrl(url);
    setQrLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setQrUrl(dataUrl);
    } catch {
      setQrUrl('');
    }
    setQrLoading(false);
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportJSON = () => {
    const json = exportToJSON({ name, layout, theme: 'default', rootNodeId, nodes });
    downloadJSON(json, name);
  };

  return (
    <div className="absolute top-20 right-4 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-semibold text-gray-800">分享与同步</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 方式一：链接 + 二维码 */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            链接 / 二维码分享
          </label>
          <p className="mt-1 text-[10px] text-gray-400 leading-relaxed">
            将完整思维导图数据编码到网址中。复制链接发送，或扫码在另一台设备直接打开。无需账号，无需服务器。
          </p>

          {!shareUrl ? (
            <button
              onClick={handleGenerate}
              className="mt-2 w-full px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              生成分享链接 & 二维码
            </button>
          ) : (
            <div className="mt-2 space-y-3">
              {/* Link */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                  title="复制链接"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 text-center">链接已复制到剪贴板！</p>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                {qrLoading ? (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs">
                    生成二维码中...
                  </div>
                ) : qrUrl ? (
                  <img src={qrUrl} alt="分享二维码" className="w-[200px] h-[200px] rounded" />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-xs">
                    二维码生成失败
                  </div>
                )}
                <p className="text-[10px] text-gray-400">用另一台设备的相机或微信扫描</p>
              </div>
            </div>
          )}
        </div>

        {/* 方式二：导出文件 */}
        <div className="pt-3 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Download className="w-3 h-3" />
            导出到文件
          </label>
          <p className="mt-1 text-[10px] text-gray-400 leading-relaxed">
            导出 JSON 文件，通过邮件/微信/云盘发送到另一台电脑，然后导入。适合批量备份或长期存档。
          </p>
          <button
            onClick={handleExportJSON}
            className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出 JSON 文件
          </button>
        </div>

        {/* 提示 */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            💡 链接分享的数据存储在网址中，不会上传到任何服务器，隐私安全。链接长度取决于导图大小，通常几百到几千字符。二维码扫描后直接在浏览器中打开即可编辑。
          </p>
        </div>
      </div>
    </div>
  );
}
