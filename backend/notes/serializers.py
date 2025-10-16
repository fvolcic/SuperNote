from rest_framework import serializers
from .models import Workspace, Project, Note


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name_enc', 'wk_blob', 'wk_salt', 'iterations', 'ai_key_enc', 'created_at', 'updated_at']
        extra_kwargs = {
            'ai_key_enc': {'required': False, 'allow_null': True},
        }


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name_enc', 'wk_blob', 'wk_salt', 'iterations', 'write_token', 'ai_key_enc']
        extra_kwargs = {
            'ai_key_enc': {'required': False, 'allow_null': True},
        }


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'workspace', 'name_enc', 'position', 'created_at', 'updated_at']


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'project', 'title_enc', 'body_enc', 'transcript_enc', 'position', 'created_at', 'updated_at']
