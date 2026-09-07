using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using UZUSIS.Core.Settings;

namespace UZUSIS.Infra.Data.Storage;

public class FotoStorage
{
    private readonly IMinioClient _minio;
    private readonly MinioSettings _settings;

    public FotoStorage(IOptions<MinioSettings> settings)
    {
        _settings = settings.Value;
        _minio = new MinioClient()
            .WithEndpoint(_settings.Endpoint)
            .WithCredentials(_settings.AccessKey, _settings.SecretKey)
            .WithSSL(_settings.UseSsl)
            .Build();
    }

    public async Task GarantirBucket()
    {
        if (!await _minio.BucketExistsAsync(new BucketExistsArgs().WithBucket(_settings.Bucket)))
        {
            await _minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_settings.Bucket));
        }

        await _minio.SetPolicyAsync(new SetPolicyArgs()
            .WithBucket(_settings.Bucket)
            .WithPolicy(PolicyLeituraPublica(_settings.Bucket)));
    }

    public async Task<string> Salvar(Stream conteudo, long tamanho, string contentType, string extensao)
    {
        var chave = Guid.NewGuid().ToString("N") + extensao;

        await _minio.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_settings.Bucket)
            .WithObject(chave)
            .WithStreamData(conteudo)
            .WithObjectSize(tamanho)
            .WithContentType(string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType));

        return chave;
    }

    public string Url(string chave) => $"{_settings.PublicBaseUrl.TrimEnd('/')}/{_settings.Bucket}/{chave}";

    private static string PolicyLeituraPublica(string bucket) =>
        "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"*\"]},\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::" + bucket + "/*\"]}]}";
}
