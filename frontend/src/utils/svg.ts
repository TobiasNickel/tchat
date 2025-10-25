// import { parseSVG, makeAbsolute } from 'svg-path-parser'
// import { svgPathProperties } from 'svg-path-properties'

export function roundCornerPath(d: string, radius: number): string {
  const commands = d.split(/(?=[MLZ])/);
  let roundedPath = '';
  let prevPoint = null;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const type = command[0];
    const points = command.slice(1).trim().split(',').map(Number);

    if (type === 'M') {
      roundedPath += `M ${points[0]},${points[1]} `;
      prevPoint = points;
    } else if (type === 'L'|| type === 'l') {
      const nextCommand = commands[i + 1];
      if (nextCommand && nextCommand[0] === 'L') {
        const nextPoints = nextCommand.slice(1).trim().split(',').map(Number);
        const dx1 = points[0] - prevPoint![0];
        const dy1 = points[1] - prevPoint![1];
        const dx2 = nextPoints[0] - points[0];
        const dy2 = nextPoints[1] - points[1];
        if (dx1 * dy2 !== dy1 * dx2) {
          const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          const sin1 = dy1 / len1;
          const cos1 = dx1 / len1;
          const sin2 = dy2 / len2;
          const cos2 = dx2 / len2;
          const thisRadius = Math.min(radius, len1/2, len2/2);
          const endOffsetX1 = points[0] - thisRadius * cos1;
          const endOffsetY1 = points[1] - thisRadius * sin1;
          const startOffsetX2 = points[0] + thisRadius * cos2;
          const startOffsetY2 = points[1] + thisRadius * sin2;
          roundedPath += `L ${endOffsetX1},${endOffsetY1} Q ${points[0]},${points[1]} ${startOffsetX2},${startOffsetY2} `;
        } else {
          roundedPath += `L ${points[0]},${points[1]} `;
        }
      } else {
        roundedPath += `L ${points[0]},${points[1]} `;
      }
      prevPoint = points;
    } else if (type === 'Z') {
      roundedPath += 'Z';
    }
  }

  return roundedPath;
}
