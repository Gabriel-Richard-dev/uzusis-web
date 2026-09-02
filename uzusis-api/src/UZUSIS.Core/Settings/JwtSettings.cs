namespace UZUSIS.Core.Settings;

public class JwtSettings
{
    public int ExpiracaoHoras { get; set; }
    public string Key { get; set; }
    public string Emissor { get; set; }
}