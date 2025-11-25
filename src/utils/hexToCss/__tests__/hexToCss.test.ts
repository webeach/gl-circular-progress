import { hexToCss } from '../hexToCss';

describe('hexToCss util', () => {
  it('should convert hex color to CSS string', () => {
    const result = hexToCss(0xff5733);
    expect(result).toBe('#ff5733');
  });

  it('should pad with zeros when needed', () => {
    const result = hexToCss(0x0000ff);
    expect(result).toBe('#0000ff');
  });

  it('should handle black color correctly', () => {
    const result = hexToCss(0x000000);
    expect(result).toBe('#000000');
  });

  it('should handle white color correctly', () => {
    const result = hexToCss(0xffffff);
    expect(result).toBe('#ffffff');
  });

  it('should handle single digit hex values', () => {
    const result = hexToCss(0x00000f);
    expect(result).toBe('#00000f');
  });
});
