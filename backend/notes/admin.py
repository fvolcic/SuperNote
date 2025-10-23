from django.contrib import admin

from .models import Note, Project, Workspace


class NoteInline(admin.TabularInline):
    model = Note
    extra = 0
    fields = ("id", "title_enc", "position", "created_at", "updated_at")
    readonly_fields = ("id", "created_at", "updated_at")
    show_change_link = True


class ProjectInline(admin.TabularInline):
    model = Project
    extra = 0
    fields = ("id", "name_enc", "position", "created_at", "updated_at")
    readonly_fields = ("id", "created_at", "updated_at")
    show_change_link = True


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("id", "name_enc", "iterations", "created_at", "updated_at")
    search_fields = ("id", "name_enc", "write_token")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [ProjectInline]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "name_enc", "position", "created_at", "updated_at")
    search_fields = ("id", "name_enc")
    list_filter = ("workspace",)
    readonly_fields = ("id", "created_at", "updated_at")
    raw_id_fields = ("workspace",)
    inlines = [NoteInline]


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "project", "title_enc", "position", "created_at", "updated_at")
    search_fields = ("id", "title_enc")
    list_filter = ("project__workspace", "project")
    readonly_fields = ("id", "created_at", "updated_at")
    raw_id_fields = ("project",)
