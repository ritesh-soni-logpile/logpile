!include FileFunc.nsh

!macro customInstall
  # Silently register user to Performance Log Users for Intel PresentMon ETW access
  ReadEnvStr $R0 USERNAME
  ${If} $R0 != ""
    nsExec::Exec 'cmd.exe /c net localgroup "Performance Log Users" "$R0" /add'
  ${EndIf}
!macroend

!macro customRemoveFiles
  # Safety check 1: Only proceed if $INSTDIR\Logpile.exe exists
  ${If} ${FileExists} "$INSTDIR\Logpile.exe"
    # Safety check 2: Never delete if $INSTDIR is empty or a drive root (e.g. C:\ or D:)
    StrLen $R2 "$INSTDIR"
    ${GetRoot} "$INSTDIR" $R3
    ${If} $INSTDIR != ""
    ${AndIf} $R2 > 3
    ${AndIf} $R3 != "$INSTDIR"
    ${AndIf} "$R3\" != "$INSTDIR"
      # Move execution directory out of $INSTDIR so files can be deleted cleanly
      SetOutPath $TEMP

      # Delete everything inside $INSTDIR EXCEPT the logpile_data folder
      ClearErrors
      FindFirst $R0 $R1 "$INSTDIR\*.*"
      ${DoWhile} $R1 != ""
        ${If} $R1 != "."
        ${AndIf} $R1 != ".."
        ${AndIf} $R1 != "logpile_data"
          ${If} ${FileExists} "$INSTDIR\$R1\*.*"
            RMDir /r "$INSTDIR\$R1"
          ${Else}
            Delete "$INSTDIR\$R1"
          ${EndIf}
        ${EndIf}
        FindNext $R0 $R1
      ${Loop}
      FindClose $R0

      # Determine whether to preserve or prompt for deleting logpile_data
      # On updates or silent uninstall: keep logpile_data intact
      ${IfNot} ${isUpdated}
      ${AndIfNot} ${Silent}
        ${If} ${FileExists} "$INSTDIR\logpile_data\*.*"
          MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
            "Do you also want to delete your Logpile data (game library, backups and artwork cache)?$\r$\n$\r$\nChoose No to keep it for a future reinstall." \
            IDNO skipDeleteData
          RMDir /r "$INSTDIR\logpile_data"
          skipDeleteData:
        ${EndIf}
      ${EndIf}

      # Non-recursive remove of $INSTDIR
      # Succeeds only if empty; if logpile_data was kept, $INSTDIR safely remains
      RMDir "$INSTDIR"
    ${EndIf}
  ${EndIf}
!macroend
