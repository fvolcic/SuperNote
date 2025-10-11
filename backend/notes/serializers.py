from rest_framework import serializers
from .models import Workspace, Project, Note


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name_enc', 'wk_blob', 'wk_salt', 'iterations', 'created_at', 'updated_at']


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name_enc', 'wk_blob', 'wk_salt', 'iterations', 'write_token']


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'workspace', 'name_enc', 'position', 'created_at', 'updated_at']


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'project', 'title_enc', 'body_enc', 'transcript_enc', 'position', 'created_at', 'updated_at']

