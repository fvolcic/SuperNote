from rest_framework import viewsets, mixins, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import QuerySet

from .models import Workspace, Project, Note
from .serializers import (
    WorkspaceSerializer,
    WorkspaceCreateSerializer,
    ProjectSerializer,
    NoteSerializer,
)
from .permissions import WriteTokenOrReadOnly


class WorkspaceViewSet(mixins.CreateModelMixin,
                       mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceSerializer
    permission_classes = [WriteTokenOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def list(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [WriteTokenOrReadOnly]

    def get_queryset(self) -> QuerySet:
        qs = super().get_queryset()
        ws = self.request.query_params.get('workspace')
        if ws:
            qs = qs.filter(workspace_id=ws)
        return qs.order_by('position', 'created_at')


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [WriteTokenOrReadOnly]

    def get_queryset(self) -> QuerySet:
        qs = super().get_queryset()
        prj = self.request.query_params.get('project')
        if prj:
            qs = qs.filter(project_id=prj)
        return qs.order_by('position', 'created_at')

