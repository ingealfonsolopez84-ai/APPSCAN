import 'dart:async';
import 'package:flutter/material.dart';
import '../data/adoration.dart';
import '../theme.dart';
import '../widgets/decor.dart';

class AdorationScreen extends StatefulWidget {
  const AdorationScreen({super.key});

  @override
  State<AdorationScreen> createState() => _AdorationScreenState();
}

class _AdorationScreenState extends State<AdorationScreen> {
  static const _totalOptions = [10, 15, 20, 30];
  int _minutes = 15;
  Timer? _timer;
  Duration _remaining = Adoration.defaultDuration;
  bool _running = false;
  int _moment = 0;

  Duration get _total => Duration(minutes: _minutes);

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _start() {
    _timer?.cancel();
    setState(() {
      _running = true;
      if (_remaining == Duration.zero) _remaining = _total;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remaining.inSeconds <= 1) {
        _timer?.cancel();
        setState(() {
          _remaining = Duration.zero;
          _running = false;
        });
      } else {
        setState(() {
          _remaining -= const Duration(seconds: 1);
          // Avanza la meditación proporcionalmente al tiempo transcurrido.
          final elapsed = _total - _remaining;
          final idx = (elapsed.inSeconds *
                  Adoration.moments.length ~/
                  _total.inSeconds)
              .clamp(0, Adoration.moments.length - 1);
          _moment = idx;
        });
      }
    });
  }

  void _pause() {
    _timer?.cancel();
    setState(() => _running = false);
  }

  void _reset() {
    _timer?.cancel();
    setState(() {
      _running = false;
      _remaining = _total;
      _moment = 0;
    });
  }

  String get _clock {
    final m = _remaining.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = _remaining.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  double get _progress {
    if (_total.inSeconds == 0) return 0;
    return 1 - _remaining.inSeconds / _total.inSeconds;
  }

  @override
  Widget build(BuildContext context) {
    final moment = Adoration.moments[_moment];
    final finished = _remaining == Duration.zero;
    return Scaffold(
      body: SereneBackground(
        child: SafeArea(
          child: CustomScrollView(
            slivers: [
              const SliverAppBar(
                pinned: true,
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                title: Text('Ante el Santísimo'),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 0, 22, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Un rato de adoración guiada, para estar con Jesús presente en la Eucaristía.',
                        style: TextStyle(
                            color: AppColors.inkSoft, fontSize: 14, height: 1.5),
                      ),
                      const SizedBox(height: 20),
                      // Selector de duración
                      if (!_running && _remaining == _total)
                        Wrap(
                          spacing: 10,
                          children: _totalOptions.map((m) {
                            final sel = m == _minutes;
                            return ChoiceChip(
                              label: Text('$m min'),
                              selected: sel,
                              onSelected: (_) => setState(() {
                                _minutes = m;
                                _remaining = _total;
                              }),
                              selectedColor: AppColors.gold,
                              labelStyle: TextStyle(
                                color: sel ? Colors.white : AppColors.ink,
                                fontWeight: FontWeight.w600,
                              ),
                              backgroundColor: Colors.white,
                              side: BorderSide(color: AppColors.blue.withOpacity(.3)),
                            );
                          }).toList(),
                        ),
                      const SizedBox(height: 20),
                      // Anillo con temporizador
                      Center(
                        child: SizedBox(
                          width: 220,
                          height: 220,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 220,
                                height: 220,
                                child: CircularProgressIndicator(
                                  value: _progress,
                                  strokeWidth: 12,
                                  strokeCap: StrokeCap.round,
                                  backgroundColor:
                                      AppColors.blueSoft.withOpacity(.35),
                                  valueColor:
                                      const AlwaysStoppedAnimation(AppColors.gold),
                                ),
                              ),
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(finished ? '¡Amén!' : _clock,
                                      style: AppTheme.serifTitle(44)),
                                  const SizedBox(height: 4),
                                  Text(
                                    finished ? 'adoración completada' : 'restantes',
                                    style: const TextStyle(
                                      letterSpacing: 2,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.gold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Controles
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: finished
                                  ? _reset
                                  : (_running ? _pause : _start),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.gold,
                                padding: const EdgeInsets.symmetric(vertical: 15),
                              ),
                              icon: Icon(
                                finished
                                    ? Icons.refresh
                                    : (_running ? Icons.pause : Icons.play_arrow),
                                size: 22,
                              ),
                              label: Text(
                                finished
                                    ? 'De nuevo'
                                    : (_running ? 'Pausar' : 'Comenzar'),
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                          if (!finished && _remaining != _total) ...[
                            const SizedBox(width: 12),
                            OutlinedButton(
                              onPressed: _reset,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.blueDeep,
                                side: BorderSide(color: AppColors.blue.withOpacity(.4)),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 18, vertical: 15),
                              ),
                              child: const Icon(Icons.stop),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 24),
                      // Meditación actual
                      SoftCard(
                        highlight: true,
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Kicker('Meditación · ${_moment + 1} de ${Adoration.moments.length}'),
                            const SizedBox(height: 8),
                            Text(moment.title, style: AppTheme.serifTitle(21)),
                            const SizedBox(height: 10),
                            Text(moment.text, style: AppTheme.verse),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      // Navegación manual entre momentos
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          TextButton.icon(
                            onPressed: _moment > 0
                                ? () => setState(() => _moment--)
                                : null,
                            icon: const Icon(Icons.chevron_left),
                            label: const Text('Anterior'),
                          ),
                          TextButton.icon(
                            onPressed: _moment < Adoration.moments.length - 1
                                ? () => setState(() => _moment++)
                                : null,
                            label: const Text('Siguiente'),
                            icon: const Icon(Icons.chevron_right),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SoftCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Kicker('Jaculatorias para el silencio'),
                            const SizedBox(height: 10),
                            ...Adoration.aspirations.map((a) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Padding(
                                        padding: EdgeInsets.only(top: 6),
                                        child: Icon(Icons.auto_awesome,
                                            size: 13, color: AppColors.goldBright),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(a,
                                            style: AppTheme.verse.copyWith(
                                                fontSize: 15)),
                                      ),
                                    ],
                                  ),
                                )),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
