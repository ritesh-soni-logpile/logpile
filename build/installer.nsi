!include "common.nsh"
!include "extractAppPackage.nsh"

CRCCheck off
WindowIcon Off
AutoCloseWindow True
RequestExecutionLevel user

!ifdef MUI_ICON
  Icon "${MUI_ICON}"
!else
  Icon "build\installer-icon.ico"
!endif

Function .onInit
  SetSilent silent
  !insertmacro check64BitAndSetRegView
FunctionEnd

Section
  InitPluginsDir
  StrCpy $INSTDIR "$PLUGINSDIR\app"
  RMDir /r $INSTDIR
  SetOutPath $INSTDIR

  !insertmacro extractEmbeddedAppPackage

  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_FILE", "$EXEPATH").r0'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_APP_FILENAME", "${APP_FILENAME}").r0'
  ${StdUtils.GetAllParameters} $R0 0

  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --installer $R0' $0
  SetErrorLevel $0

  SetOutPath $EXEDIR
  RMDir /r $INSTDIR
SectionEnd
