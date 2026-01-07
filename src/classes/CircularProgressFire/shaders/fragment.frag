#version 300 es
// Using highp to prevent coordinate jitter on mobile devices
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_innerRadius;
uniform float u_outerRadius;
uniform float u_startAngle;
uniform float u_reversed;
uniform sampler2D u_gradientTexture;
uniform float u_intensity;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Simplex noise helper functions
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
  -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 st = v_uv * 2.0 - 1.0;

  // FIX 1: Safe aspect ratio correction
  if (u_resolution.y > 0.0) {
    st.x *= u_resolution.x / u_resolution.y;
  }

  float radius = length(st);

  // --- ANGLE CALCULATION ---
  float absAngle = atan(st.x, st.y);
  if (absAngle < 0.0) absAngle += TWO_PI;

  float relAngle = absAngle - u_startAngle;
  relAngle = mod(relAngle, TWO_PI);
  if (relAngle < 0.0) relAngle += TWO_PI;

  if (u_reversed > 0.5) {
    relAngle = TWO_PI - relAngle;
  }

  float angle = mod(relAngle, TWO_PI);
  float progressAngle = u_progress * TWO_PI;

  // --- FIRE NOISE ---
  float time = u_time * 2.0;

  float noiseFreq = 2.0;
  float radiusFreq = 3.0;

  float trackWidth = u_outerRadius - u_innerRadius;
  float normRadius = (radius - u_innerRadius) / trackWidth;

  // Polar projection into 2D plane for seamless looping
  vec2 polarUV = vec2(cos(angle), sin(angle)) * (2.0 + normRadius) - vec2(time, time * 0.5);
  float n = snoise(polarUV * 1.5);

  vec2 polarUV2 = vec2(cos(angle + 1.0), sin(angle + 1.0)) * (3.0 + normRadius * 2.0) - vec2(time * 1.5, -time);
  float n2 = snoise(polarUV2 * 2.0);

  float fireNoise = n * 0.6 + n2 * 0.4;

  // --- RING SHAPE & MASK ---

  // FIX 2: Adaptive Anti-Aliasing (AA) for sharp edges on mobile
  float aa = max(2.0 / u_resolution.y, 0.002);

  // Inner Edge Mask
  float ringInner = smoothstep(u_innerRadius - aa, u_innerRadius, radius);

  // Border radius / Cap logic
  float trackCenter = (u_innerRadius + u_outerRadius) * 0.5;
  float halfWidth = (u_outerRadius - u_innerRadius) * 0.5;
  float capRadius = halfWidth;

  float roundingFactor = 1.0;
  if (u_progress > 0.9) {
    roundingFactor = (1.0 - u_progress) * 10.0;
  }

  float effectiveCapRadius = capRadius * roundingFactor;

  float dEnd = (progressAngle - angle) * trackCenter;
  float dStart = angle * trackCenter;
  float dSide = halfWidth - abs(radius - trackCenter);

  // Head Rounding
  float headRounding = 1.0;
  if (dEnd < effectiveCapRadius && dSide < effectiveCapRadius) {
    float cx = effectiveCapRadius - dEnd;
    float cy = effectiveCapRadius - dSide;
    float cornerDist = sqrt(cx*cx + cy*cy);
    headRounding = 1.0 - smoothstep(effectiveCapRadius - aa, effectiveCapRadius + aa, cornerDist);
  }

  // Tail Rounding
  float tailRounding = 1.0;
  if (dStart < effectiveCapRadius && dSide < effectiveCapRadius) {
    float cx = effectiveCapRadius - dStart;
    float cy = effectiveCapRadius - dSide;
    float cornerDist = sqrt(cx*cx + cy*cy);
    tailRounding = 1.0 - smoothstep(effectiveCapRadius - aa, effectiveCapRadius + aa, cornerDist);
  }

  float roundingAlpha = headRounding * tailRounding;

  // Fire/Flame outer edge
  float flameHeight = u_outerRadius + fireNoise * 0.04 * u_intensity;

  // FIX 3: Robust masking using multiplication instead of subtraction
  // Invert smoothstep for the outer edge
  float ringOuter = 1.0 - smoothstep(flameHeight, flameHeight + 0.02, radius);

  // Combine masks
  float ringAlpha = ringInner * ringOuter;

  // Apply rounding
  ringAlpha *= roundingAlpha;

  // --- PROGRESS FILL LOGIC ---
  float isVisible = 0.0;

  if (u_progress >= 0.995) {
    isVisible = 1.0;
  } else {
    float diff = progressAngle - angle;
    if (diff > 0.0) {
      isVisible = 1.0;
    }
  }

  float headFade = smoothstep(0.0, 0.02, progressAngle - angle);
  float tailFade = smoothstep(0.0, 0.02, angle);

  if (u_progress >= 0.99) {
    tailFade = 1.0;
    headFade = 1.0;
  }

  float fillAlpha = isVisible * headFade * tailFade;

  if (u_progress < 0.001) fillAlpha = 0.0;

  // --- COLORING ---
  float centerDist = abs(normRadius - 0.5) * 2.0;
  float heatMap = (fireNoise * 0.5 + 0.5);

  heatMap *= (1.0 - centerDist * 0.5);
  heatMap *= (0.8 + u_intensity * 0.4);

  float relPos = angle / (progressAngle + 0.001);
  float heatBoostHead = smoothstep(0.7, 1.0, relPos) * 0.4 * u_intensity;
  float heatBoostTail = smoothstep(0.3, 0.0, relPos) * 0.4 * u_intensity;

  heatMap += heatBoostHead + heatBoostTail;

  float gradientPos = angle / TWO_PI;
  vec3 baseColor = texture(u_gradientTexture, vec2(gradientPos, 0.5)).rgb;

  vec3 black = vec3(0.0);
  vec3 white = vec3(1.0);
  vec3 finalColor = black;

  if (heatMap < 0.5) {
    float t = heatMap / 0.5;
    finalColor = mix(black, baseColor, t * t);
  } else {
    float t = (heatMap - 0.5) / 0.5;
    finalColor = mix(baseColor, white, t * t);
  }

  float finalAlpha = ringAlpha * fillAlpha;

  // FIX 4: CRITICAL FOR MOBILE
  // Discard pixels with near-zero alpha to prevent "black square" artifacts
  // and blending issues on iOS/Android browsers.
  if (finalAlpha < 0.01) {
    discard;
  }

  fragColor = vec4(finalColor, finalAlpha);
}
