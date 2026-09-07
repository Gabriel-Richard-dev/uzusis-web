namespace UZUSIS.Core.Settings;

public class MinioSettings
{
    public string Endpoint { get; set; } = null!;
    public string AccessKey { get; set; } = null!;
    public string SecretKey { get; set; } = null!;
    public string Bucket { get; set; } = "produtos";
    public bool UseSsl { get; set; }
    public string PublicBaseUrl { get; set; } = "/storage";
}
