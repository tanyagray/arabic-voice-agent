import 'dart:math' show max;

import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart' as sdk;
import 'package:livekit_components/livekit_components.dart' as components;
import 'package:provider/provider.dart';

import '../controllers/app_ctrl.dart';
import '../support/agent_selector.dart';
import '../widgets/agent_layout_switcher.dart';
import '../widgets/camera_toggle_button.dart';
import '../widgets/message_bar.dart';

class AgentTrackView extends StatelessWidget {
  const AgentTrackView({super.key});

  @override
  Widget build(BuildContext context) => AgentParticipantSelector(
        builder: (ctx, agentParticipant) => Selector<components.ParticipantContext?, sdk.TrackPublication?>(
          selector: (ctx, agentCtx) {
            final videoTrack = agentCtx?.tracks.where((t) => t.kind == sdk.TrackType.VIDEO).firstOrNull;
            final audioTrack = agentCtx?.tracks.where((t) => t.kind == sdk.TrackType.AUDIO).firstOrNull;
            // Prioritize video track
            return videoTrack ?? audioTrack;
          },
          builder: (ctx, mediaTrack, child) => ChangeNotifierProvider<components.TrackReferenceContext?>.value(
            value:
                agentParticipant == null ? null : components.TrackReferenceContext(agentParticipant, pub: mediaTrack),
            child: Builder(
              builder: (ctx) => Container(
                // color: Colors.red,
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 50),
                alignment: Alignment.center,
                child: Container(
                  // color: Colors.blue,
                  constraints: const BoxConstraints(maxHeight: 350),
                  child: Builder(builder: (ctx) {
                    final trackReferenceContext = ctx.watch<components.TrackReferenceContext?>();
                    // Switch according to video or audio

                    if (trackReferenceContext?.isVideo ?? false) {
                      return const components.VideoTrackWidget();
                    }

                    return const components.AudioVisualizerWidget(
                      options: components.AudioVisualizerWidgetOptions(
                        barCount: 5,
                        width: 32,
                        minHeight: 32,
                        maxHeight: 320,
                        // color: Theme.of(ctx).colorScheme.primary,
                      ),
                    );
                  }),
                ),
              ),
            ),
          ),
        ),
      );
}

class FrontView extends StatelessWidget {
  final AgentScreenState screenState;

  const FrontView({
    super.key,
    required this.screenState,
  });

  @override
  Widget build(BuildContext context) => components.MediaDeviceContextBuilder(
        builder: (context, roomCtx, mediaDeviceCtx) => Row(
          spacing: 20,
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Flexible(
              flex: 2,
              fit: FlexFit.tight,
              child: AgentTrackView(),
            ),
            if (screenState == AgentScreenState.transcription && mediaDeviceCtx.cameraOpened)
              Flexible(
                fit: FlexFit.tight,
                child: AnimatedOpacity(
                  opacity: (screenState == AgentScreenState.transcription && mediaDeviceCtx.cameraOpened) ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 300),
                  child: Container(
                    clipBehavior: Clip.hardEdge,
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(15)),
                    child: components.ParticipantSelector(
                      filter: (identifier) => identifier.isVideo && identifier.isLocal,
                      builder: (context, identifier) => components.VideoTrackWidget(
                        fit: sdk.VideoViewFit.cover,
                        noTrackBuilder: (ctx) => Container(),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
}

class AgentScreen extends StatelessWidget {
  const AgentScreen({super.key});

  @override
  Widget build(BuildContext ctx) => Material(
        child: Selector<AppCtrl, AgentLayoutState>(
          selector: (ctx, appCtrl) => AgentLayoutState(
            isTranscriptionVisible: appCtrl.agentScreenState == AgentScreenState.transcription,
            isCameraVisible: appCtrl.isUserCameEnabled,
            isScreenshareVisible: appCtrl.isScreenshareEnabled,
          ),
          builder: (ctx, agentLayoutState, child) => AgentLayoutSwitcher(
            layoutState: agentLayoutState,
            // agentViewBuilder: (ctx) => AgentTrackView(),
            buildAgentView: (ctx) => const AgentTrackView(),
            buildCameraView: (ctx) => Container(
              clipBehavior: Clip.hardEdge,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(15),
              ),
              child: components.MediaDeviceContextBuilder(
                builder: (context, roomCtx, mediaDeviceCtx) => components.ParticipantSelector(
                  filter: (identifier) => identifier.isVideo && identifier.isLocal,
                  builder: (context, identifier) => Stack(
                    children: [
                      components.VideoTrackWidget(
                        fit: sdk.VideoViewFit.cover,
                        noTrackBuilder: (ctx) => Container(),
                      ),
                      Positioned(
                        right: 10,
                        bottom: 10,
                        child: CameraToggleButton(
                          onTap: () => mediaDeviceCtx.toggleCameraPosition(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            buildScreenShareView: (ctx) => Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.3),
              ),
              child: const Text('Screenshare View'),
            ),
            transcriptionsBuilder: (ctx) => Column(
              mainAxisSize: MainAxisSize.max,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => ctx.read<AppCtrl>().messageFocusNode.unfocus(),
                    child: components.TranscriptionBuilder(
                      builder: (context, transcriptions) => components.TranscriptionWidget(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 10,
                        ),
                        transcriptions: transcriptions,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding:
                      EdgeInsets.only(left: 16, right: 16, bottom: max(0, MediaQuery.of(ctx).viewInsets.bottom - 80)),
                  child: Selector<AppCtrl, bool>(
                    selector: (ctx, appCtx) => appCtx.isSendButtonEnabled,
                    builder: (ctx, isSendEnabled, child) => MessageBar(
                      focusNode: ctx.read<AppCtrl>().messageFocusNode,
                      isSendEnabled: isSendEnabled,
                      controller: ctx.read<AppCtrl>().messageCtrl,
                      onSendTap: () => ctx.read<AppCtrl>().sendMessage(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
