from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import WorkspaceViewSet, ProjectViewSet, NoteViewSet

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'notes', NoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
]

