#version 300 es
// Using highp to prevent coordinate jitter on mobile devices
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_flowTime;
uniform float u_progress;
uniform float u_velocity;
uniform vec2 u_resolution;
uniform sampler2D u_gradientTexture;
uniform float u_innerRadius;
uniform float u_outerRadius;

uniform float u_reversed;
uniform float u_startAngle;
uniform float u_volume;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function for random numbers (more stable than sine on mobile)
float random(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    // Normalize coordinates
    vec2 st = v_uv * 2.0 - 1.0;

    // Aspect ratio correction (guard against division by zero)
    if (u_resolution.y > 0.0) {
        st.x *= u_resolution.x / u_resolution.y;
    }

    float radius = length(st);

    // Angle calculation
    float absAngle = atan(st.x, st.y);
    if (absAngle < 0.0) absAngle += TWO_PI;

    float relAngle = absAngle - u_startAngle;
    relAngle = mod(relAngle, TWO_PI);
    if (relAngle < 0.0) relAngle += TWO_PI;

    if (u_reversed > 0.5) {
        relAngle = TWO_PI - relAngle;
    }

    float angle = mod(relAngle, TWO_PI);

    float centerRadius = (u_innerRadius + u_outerRadius) * 0.5;
    float trackWidth = u_outerRadius - u_innerRadius;
    float safeTrackWidth = max(trackWidth, 0.001);
    float progressAngle = u_progress * TWO_PI;

    // --- PHYSICS ---
    float flowProfile = 1.0 - pow(abs(radius - centerRadius) / (safeTrackWidth * 0.5), 2.0);
    flowProfile = clamp(flowProfile, 0.0, 1.0);

    float pressureBulge = u_velocity * flowProfile * 1.0;
    float ripples = sin(radius * 40.0 - u_flowTime * 15.0) * 0.03 * abs(u_velocity);

    float activeBoundary = progressAngle + pressureBulge + ripples;

    // --- ROUNDED CAPS ---
    float halfWidth = safeTrackWidth * 0.5;
    float trackCenter = centerRadius;
    float capRadius = halfWidth;

    // Rounding animation when completing the circle
    float roundingFactor = 1.0;
    if (u_progress > 0.9) {
        roundingFactor = (1.0 - u_progress) * 10.0;
    }
    float effectiveCapRadius = capRadius * roundingFactor;

    float dEnd = (activeBoundary - angle) * trackCenter;
    float dStart = angle * trackCenter;
    float dSide = halfWidth - abs(radius - trackCenter);

    // Edge smoothing for mobile (slightly softer)
    float capSoftness = 0.01;

    // Head rounding
    float headRounding = 1.0;
    if (dEnd < effectiveCapRadius && dSide < effectiveCapRadius) {
        float cx = effectiveCapRadius - dEnd;
        float cy = effectiveCapRadius - dSide;
        float cornerDist = sqrt(cx*cx + cy*cy);
        headRounding = 1.0 - smoothstep(effectiveCapRadius - capSoftness, effectiveCapRadius + capSoftness, cornerDist);
    }

    // Tail rounding
    float tailRounding = 1.0;
    if (dStart < effectiveCapRadius && dSide < effectiveCapRadius) {
        float cx = effectiveCapRadius - dStart;
        float cy = effectiveCapRadius - dSide;
        float cornerDist = sqrt(cx*cx + cy*cy);
        tailRounding = 1.0 - smoothstep(effectiveCapRadius - capSoftness, effectiveCapRadius + capSoftness, cornerDist);
    }

    float roundingAlpha = headRounding * tailRounding;

    // --- FILL ---
    float fill = smoothstep(0.0, 0.02, activeBoundary - angle);
    if (u_progress > 0.99) fill = 1.0;
    if (u_progress < 0.02 && angle > 6.0) fill = 0.0;

    // --- COLOR & RING MASK ---

    // FIX: More robust anti-aliasing (AA) calculation
    // Clamp minimum to 0.002 to prevent edges from being too sharp on 4K/Retina screens
    float aa = max(2.0 / u_resolution.y, 0.002);

    // FIX: Use multiplication instead of subtraction for the ring mask.
    // This is more stable on mobile GPUs.
    float innerEdge = smoothstep(u_innerRadius - aa, u_innerRadius, radius);
    float outerEdge = 1.0 - smoothstep(u_outerRadius, u_outerRadius + aa, radius);
    float ringAlpha = innerEdge * outerEdge;

    // Gradient
    float t = angle / TWO_PI;
    vec3 waterColor = texture(u_gradientTexture, vec2(t, 0.5)).rgb;

    float flowLines = sin(angle * 20.0 - u_flowTime * 5.0) * sin(radius * 100.0) * 0.1;
    waterColor += vec3(flowLines);

    // --- FOAM ---
    float distToHead = abs(angle - activeBoundary);
    float foamThickness = 0.02 + abs(u_velocity) * 0.15;
    float foam = smoothstep(foamThickness, 0.0, distToHead) * fill;
    float foamSuppress = 1.0 - smoothstep(0.95, 1.0, u_progress);
    foam *= foamSuppress;

    float sparkle = random(v_uv * 10.0 + u_flowTime);
    foam *= (0.8 + 0.5 * sparkle);

    vec3 finalColor = mix(waterColor, vec3(1.0), foam);

    // --- VOLUME ---
    float trackCenterDist = abs(radius - centerRadius) / (safeTrackWidth * 0.5);
    float cylinderNormalZ = sqrt(max(0.0, 1.0 - trackCenterDist * trackCenterDist));
    float specular = pow(cylinderNormalZ, 3.0) * 0.4;
    float edgeShadow = smoothstep(0.8, 1.0, trackCenterDist);
    vec3 lightedColor = finalColor + vec3(specular);
    lightedColor *= (1.0 - edgeShadow * 0.5);
    finalColor = mix(finalColor, lightedColor, u_volume);

    // --- FINAL ALPHA ---
    float finalAlpha = ringAlpha * fill * roundingAlpha;

    // CRITICAL FIX FOR MOBILE:
    // If alpha is very small, discard the pixel completely.
    // This solves the "black squares" and incorrect blending issue on iOS/Android.
    if (finalAlpha < 0.01) {
        discard;
    }

    fragColor = vec4(finalColor, finalAlpha);
}
