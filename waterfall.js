import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export default function waterfall({ svg, data, color }) {
  let width, marginLeft, marginRight;

  const marginTop = 0;
  const marginBottom = 0;
  const rowHeight = 32;
  const barHeight = 24;
  const columnGap = 16;
  const textOffset = 8;
  const height = rowHeight * data.length;

  const formatValue = (d) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(d * 1e6);

  let acc = 0;
  const rows = [];
  const links = [];
  data.forEach((d, i) => {
    const value = d.Amount;
    let x0, x1;
    switch (d.Type) {
      case "Profit":
        x0 = acc;
        acc += value;
        x1 = acc;
        if (i > 0) {
          links.push({
            x: x0,
            y0: i - 1,
            y1: i,
          });
        }
        break;
      case "Cost":
        x0 = acc;
        acc -= value;
        x1 = acc;
        if (i > 0) {
          links.push({
            x: x0,
            y0: i - 1,
            y1: i,
          });
        }
        break;
      case "Summary":
        const summaryRows = d["Summary Rows"]
          .trim()
          .split(",")
          .map((d) => +d - 1);
        switch (d["Summary Action"]) {
          case "Add":
            x0 = rows[summaryRows[0]].stacked[0];
            x1 = rows[summaryRows[summaryRows.length - 1]].stacked[1];
            links.push({
              x: x0,
              y0: summaryRows[0],
              y1: i,
            });
            links.push({
              x: x1,
              y0: i - 1,
              y1: i,
            });
            break;
          case "Subtract":
            x0 = 0;
            x1 = rows[summaryRows[summaryRows.length - 1]].stacked[1];
            acc = x1;
            links.push({
              x: x1,
              y0: i - 1,
              y1: i,
            });
            break;
          default:
            throw new Error("Unknown Summary Action");
        }
        break;
      default:
        throw new Error("Unknown Type");
    }
    rows.push({
      key: d.Item,
      value,
      color: color(d.Type),
      stacked: [x0, x1],
      isSummary: d["Type"] === "Summary",
      isFlipped: x0 > x1,
    });
  });

  const x = d3.scaleLinear().domain(d3.extent(rows.flatMap((d) => d.stacked)));
  const keys = rows.map((d) => d.key);
  const y = d3.scalePoint().domain(keys).range([0, height]).padding(0.5);

  svg.classed("waterfall", true);

  const domainLine = svg
    .append("line")
    .attr("class", "domain")
    .attr("y1", marginTop)
    .attr("y2", height - marginBottom)
    .attr("stroke", "currentColor");

  const linkLine = svg
    .append("g")
    .attr("class", "links")
    .attr("stroke", "currentColor")
    .selectChildren()
    .data(links)
    .join("line")
    .attr("class", "link")
    .attr("y1", (d) => y(keys[d.y0]) - barHeight / 2)
    .attr("y2", (d) => y(keys[d.y1]) + barHeight / 2);

  const rowG = svg
    .append("g")
    .attr("class", "rows")
    .selectChildren()
    .data(rows)
    .join("g")
    .attr("class", "row")
    .attr("transform", (d) => `translate(0,${y(d.key)})`);

  const keyText = rowG
    .append("text")
    .attr("class", "row__key")
    .attr("dy", "0.35em")
    .attr("font-weight", (d) => (d.isSummary ? "700" : "400"))
    .text((d) => d.key)
    .each(function (d) {
      d.keyBBox = this.getBBox();
    });

  const valueText = rowG
    .append("text")
    .attr("class", "row__value")
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.isFlipped ? "end" : "start"))
    .attr("dx", (d) => (d.isFlipped ? -textOffset : textOffset))
    .text((d) => formatValue(d.value))
    .each(function (d) {
      d.valueBBox = this.getBBox();
    });

  const barRect = rowG
    .append("rect")
    .attr("class", "row__bar")
    .attr("fill", (d) => d.color)
    .attr("y", -barHeight / 2)
    .attr("height", barHeight);

  marginLeft =
    d3.max(rows, (d) => Math.ceil(d.keyBBox.width)) +
    columnGap +
    (d3.max(
      rows.filter((d) => d.isFlipped && d.stacked[1] < 0),
      (d) => Math.ceil(d.valueBBox.width)
    ) ?? 0) +
    textOffset;
  marginRight =
    d3.max(
      rows.filter((d) => !d.isFlipped),
      (d) => Math.ceil(d.valueBBox.width)
    ) + textOffset;

  domainLine.attr("transform", `translate(${marginLeft},0)`);

  new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      resized(entry.contentRect);
    });
  }).observe(svg.node());

  function resized(contentRect) {
    if (width === contentRect.width) return;
    width = contentRect.width;

    x.range([marginLeft, width - marginRight]);

    svg.attr("viewBox", [0, 0, width, height]);

    render();
  }

  function render() {
    linkLine.attr("transform", (d) => `translate(${x(d.x)},0)`);

    valueText.attr("x", (d) => x(d.stacked[1]));

    barRect
      .attr("x", (d) => x(Math.min(...d.stacked)))
      .attr("width", (d) => Math.abs(x(d.stacked[0]) - x(d.stacked[1])));
  }
}
