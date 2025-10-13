import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:logging/logging.dart';

/// Data class representing the connection details needed to join a LiveKit room
/// This includes the server URL, room name, participant info, and auth token
class ConnectionDetails {
  final String serverUrl;
  final String roomName;
  final String participantName;
  final String participantToken;

  ConnectionDetails({
    required this.serverUrl,
    required this.roomName,
    required this.participantName,
    required this.participantToken,
  });

  factory ConnectionDetails.fromJson(Map<String, dynamic> json) {
    return ConnectionDetails(
      serverUrl: json['serverUrl'],
      roomName: json['roomName'],
      participantName: json['participantName'],
      participantToken: json['participantToken'],
    );
  }
}

/// Service for fetching LiveKit authentication tokens
///
/// Priority order:
/// 1. Hardcoded token (development only)
/// 2. Custom token server (production/development)
/// 3. LiveKit Cloud sandbox (development fallback)
///
/// To use a custom token server (recommended for production):
/// - Set LIVEKIT_URL in .env with your LiveKit server URL
/// - The service will fetch tokens from the configured token server endpoint
///
/// To use the LiveKit Cloud sandbox (development only):
/// - Enable your sandbox here https://cloud.livekit.io/projects/p_/sandbox/templates/token-server
/// - Create .env file with your LIVEKIT_SANDBOX_ID
///
/// To use a hardcoded token (development only):
/// - Generate a token: https://docs.livekit.io/home/cli/cli-setup/#generate-access-token
/// - Set `hardcodedServerUrl` and `hardcodedToken` below
///
/// See https://docs.livekit.io/home/get-started/authentication for more information
class TokenService {
  static final _logger = Logger('TokenService');

  // For hardcoded token usage (development only)
  final String? hardcodedServerUrl = null;
  final String? hardcodedToken = null;

  // Custom token server endpoint
  final String tokenServerUrl = 'https://arabic-voice-agent-dev-web-api.onrender.com/livekit/token';

  // Get LiveKit server URL from environment variables
  String? get livekitServerUrl {
    final value = dotenv.env['LIVEKIT_URL'];
    if (value != null) {
      return value.replaceAll('"', '');
    }
    return null;
  }

  // Get the sandbox ID from environment variables
  String? get sandboxId {
    final value = dotenv.env['LIVEKIT_SANDBOX_ID'];
    if (value != null) {
      // Remove unwanted double quotes if present
      return value.replaceAll('"', '');
    }
    return null;
  }

  // LiveKit Cloud sandbox API endpoint
  final String sandboxUrl = 'https://cloud-api.livekit.io/api/sandbox/connection-details';

  /// Main method to get connection details
  /// First tries hardcoded credentials, then custom token server, then falls back to sandbox
  Future<ConnectionDetails> fetchConnectionDetails({
    required String roomName,
    required String participantName,
  }) async {
    final hardcodedDetails = fetchHardcodedConnectionDetails(
      roomName: roomName,
      participantName: participantName,
    );

    if (hardcodedDetails != null) {
      return hardcodedDetails;
    }

    // Try custom token server first
    try {
      return await fetchConnectionDetailsFromTokenServer(
        roomName: roomName,
        participantName: participantName,
      );
    } catch (e) {
      _logger.warning('Failed to get token from custom server, falling back to sandbox: $e');
      return await fetchConnectionDetailsFromSandbox(
        roomName: roomName,
        participantName: participantName,
      );
    }
  }

  Future<ConnectionDetails> fetchConnectionDetailsFromTokenServer({
    required String roomName,
    required String participantName,
  }) async {
    final uri = Uri.parse(tokenServerUrl).replace(queryParameters: {
      'room_name': roomName,
      'participant_identity': participantName,
      'participant_name': participantName,
    });

    try {
      final response = await http.get(uri);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        try {
          final data = jsonDecode(response.body);
          // The token server returns both 'token' and 'url' fields
          final serverUrl = data['url'] ?? livekitServerUrl;
          if (serverUrl == null) {
            throw Exception('No server URL available from token server or environment');
          }

          return ConnectionDetails(
            serverUrl: serverUrl,
            roomName: roomName,
            participantName: participantName,
            participantToken: data['token'],
          );
        } catch (e) {
          _logger.severe('Error parsing token from custom server, response: ${response.body}');
          throw Exception('Error parsing token from custom server: $e');
        }
      } else {
        _logger.severe('Error from custom token server: ${response.statusCode}, response: ${response.body}');
        throw Exception('Error from custom token server: HTTP ${response.statusCode}');
      }
    } catch (e) {
      _logger.severe('Failed to connect to custom token server: $e');
      rethrow;
    }
  }

  Future<ConnectionDetails> fetchConnectionDetailsFromSandbox({
    required String roomName,
    required String participantName,
  }) async {
    if (sandboxId == null) {
      throw Exception('Sandbox ID is not set');
    }

    final uri = Uri.parse(sandboxUrl).replace(queryParameters: {
      'roomName': roomName,
      'participantName': participantName,
    });

    try {
      final response = await http.post(
        uri,
        headers: {'X-Sandbox-ID': sandboxId!},
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        try {
          final data = jsonDecode(response.body);
          return ConnectionDetails.fromJson(data);
        } catch (e) {
          _logger.severe('Error parsing connection details from LiveKit Cloud sandbox, response: ${response.body}');
          throw Exception('Error parsing connection details from LiveKit Cloud sandbox');
        }
      } else {
        _logger.severe('Error from LiveKit Cloud sandbox: ${response.statusCode}, response: ${response.body}');
        throw Exception('Error from LiveKit Cloud sandbox');
      }
    } catch (e) {
      _logger.severe('Failed to connect to LiveKit Cloud sandbox: $e');
      throw Exception('Failed to connect to LiveKit Cloud sandbox');
    }
  }

  ConnectionDetails? fetchHardcodedConnectionDetails({
    required String roomName,
    required String participantName,
  }) {
    if (hardcodedServerUrl == null || hardcodedToken == null) {
      return null;
    }

    return ConnectionDetails(
      serverUrl: hardcodedServerUrl!,
      roomName: roomName,
      participantName: participantName,
      participantToken: hardcodedToken!,
    );
  }
}
