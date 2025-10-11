from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Workspace, Project, Note


def _get_workspace_from_request(view, request):
    if hasattr(view, 'basename') and view.basename == 'workspace':
        if request.method == 'POST':
            return None
        pk = view.kwargs.get('pk') or view.kwargs.get('id')
        if pk:
            try:
                return Workspace.objects.only('write_token').get(pk=pk)
            except Workspace.DoesNotExist:
                return None
        return None
    if hasattr(view, 'basename') and view.basename == 'project':
        if request.method == 'POST':
            ws_id = request.data.get('workspace') or request.query_params.get('workspace')
            if ws_id:
                try:
                    return Workspace.objects.only('write_token').get(pk=ws_id)
                except Workspace.DoesNotExist:
                    return None
            return None
        obj = getattr(view, 'get_object', None)
        if obj:
            prj = view.get_object()
            return prj.workspace
    if hasattr(view, 'basename') and view.basename == 'note':
        if request.method == 'POST':
            prj_id = request.data.get('project') or request.query_params.get('project')
            if prj_id:
                try:
                    prj = Project.objects.select_related('workspace').get(pk=prj_id)
                    return prj.workspace
                except Project.DoesNotExist:
                    return None
            return None
        obj = getattr(view, 'get_object', None)
        if obj:
            note = view.get_object()
            return note.project.workspace
    return None


class WriteTokenOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        # Allow creating a workspace without a token
        if getattr(view, 'basename', None) == 'workspace' and request.method == 'POST':
            return True
        if request.method in SAFE_METHODS:
            return True
        ws = _get_workspace_from_request(view, request)
        if ws is None:
            return False
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return False
        token = auth.split(' ', 1)[1].strip()
        return token and token == ws.write_token

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if isinstance(obj, Workspace):
            ws = obj
        elif isinstance(obj, Project):
            ws = obj.workspace
        elif isinstance(obj, Note):
            ws = obj.project.workspace
        else:
            return False
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return False
        token = auth.split(' ', 1)[1].strip()
        return token and token == ws.write_token
