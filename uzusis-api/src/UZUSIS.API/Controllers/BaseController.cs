using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UZUSIS.Application.Notification;

namespace UZUSIS.API.Controllers;
[Authorize]
[ApiController]
[Route("[controller]")]
public abstract class BaseController : ControllerBase
{
    private readonly INotificator _notificator;
    public BaseController(INotificator notificator)
    {
        _notificator = notificator;
    }
    
    protected ActionResult CustomResponse(object? reponse = null)
    {
        if (IsValidOperation)
        {
            return Ok(reponse);
        }

        if (_notificator.IsNotFoundResource)
        {
            return NotFound();
        }

        return BadRequest(_notificator.GetNotifications().ToList());
    }


    private bool IsValidOperation => !(_notificator.HasNotification || _notificator.IsNotFoundResource);

}