using System.Collections.Generic;
using FluentValidation.Results;

namespace UZUSIS.Application.Notification;

public interface INotificator
{
    void Handle(string mensagem);
    void Handle(List<ValidationFailure> failures);
    void HandleNotFoundResource();
    IEnumerable<string> GetNotifications();
    bool HasNotification { get; }
    bool IsNotFoundResource { get; }
}