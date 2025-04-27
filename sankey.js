import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as d3Sankey from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/+esm";

export default function sankey({ svg, data, color }) {
  let width = 800,
    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0;

  const height = 480;
  const nodeWidth = 24;
  const nodePadding = 64;
  const textOffset = 8;
  const labelPadding = 4;
  const labelBorderRadius = 4;

  const formatValue = (d) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(d * 1e6);

  const nodesMap = new Map();
  const links = data.map((d) => {
    const source = d.Source;
    const target = d.Target;
    const value = d.Amount;

    if (!nodesMap.has(source)) {
      nodesMap.set(source, {
        name: source,
      });
    }
    if (!nodesMap.has(target)) {
      nodesMap.set(target, {
        name: target,
        category: d.Type,
      });
    }

    return {
      source,
      target,
      value,
      category: d.Type,
    };
  });
  nodesMap.forEach((node) => {
    if (!("category" in node)) {
      node.category = "Revenue";
    }
  });
  const nodes = Array.from(nodesMap.values());

  const sankey = d3Sankey
    .sankey()
    .nodeId((d) => d.name)
    .nodeAlign(d3Sankey.sankeyCenter)
    .nodeSort(null)
    .nodeWidth(nodeWidth)
    .nodePadding(nodePadding)
    .extent([
      [marginLeft, marginTop],
      [width - marginRight, height - marginBottom],
    ]);
  sankey({ nodes, links });

  svg.classed("sankey", true);

  const linkPath = svg
    .append("g")
    .attr("class", "links")
    .attr("fill-opacity", 0.25)
    .selectChildren()
    .data(links)
    .join("path")
    .attr("class", "link")
    .attr("fill", (d) => color(d.category))
    .style("mix-blend-mode", "multiply");

  const nodeRect = svg
    .append("g")
    .attr("class", "nodes")
    .selectChildren()
    .data(nodes)
    .join("rect")
    .attr("class", "node")
    .attr("fill", (d) => color(d.category));

  const labelsG = svg.append("g").attr("class", "labels");

  const labelG = labelsG
    .selectChildren()
    .data(nodes)
    .join("g")
    .attr("class", "label")
    .attr("text-anchor", (d) => (d.category === "Revenue" ? "end" : "start"));

  labelG
    .append("rect")
    .attr("class", "label__rect")
    .attr("rx", labelBorderRadius)
    .attr("fill", "#ffffff")
    .attr("fill-opacity", 0.75);

  labelG
    .append("text")
    .attr("class", "label__key")
    .attr("fill", "currentColor")
    .attr("font-weight", "700")
    .attr("dy", "-0.25em")
    .text((d) => d.name);

  labelG
    .append("text")
    .attr("class", "label__value")
    .attr("fill", "currentColor")
    .attr("font-weight", "400")
    .attr("dy", "0.9em")
    .text((d) => formatValue(d.value));

  labelG
    .each(function (d) {
      d.labelBBox = this.getBBox();
    })
    .select(".label__rect")
    .attr("x", (d) =>
      d.category === "Revenue"
        ? -d.labelBBox.width - labelPadding
        : -labelPadding
    )
    .attr("y", (d) => -d.labelBBox.height / 2 - labelPadding)
    .attr("width", (d) => d.labelBBox.width + labelPadding * 2)
    .attr("height", (d) => d.labelBBox.height + labelPadding * 2);

  new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      resized(entry.contentRect);
    });
  }).observe(svg.node());

  function resized(contentRect) {
    if (width === contentRect.width) return;
    width = contentRect.width;

    svg.attr("viewBox", [0, 0, width, height]);

    adjustMargin();
    render();
  }

  function adjustMargin() {
    sankey.extent([
      [0, 0],
      [width, height],
    ])({ nodes, links });

    labelG.attr("transform", (d) => {
      const x =
        d.category === "Revenue" ? d.x0 - textOffset : d.x1 + textOffset;
      return `translate(${x},${(d.y0 + d.y1) / 2})`;
    });

    const bbox = labelsG.node().getBBox();
    marginLeft = Math.max(Math.round(-bbox.x), 0);
    marginTop = Math.max(Math.round(-bbox.y), 0);
    marginRight = Math.max(Math.round(-width + bbox.x + bbox.width), 0);
    marginBottom = Math.max(Math.round(-height + bbox.y + bbox.height), 0);
  }

  function render() {
    sankey.extent([
      [marginLeft + 1, marginTop + 1],
      [width - marginRight - 1, height - marginBottom - 1],
    ])({ nodes, links });

    linkPath.attr("d", sankeyLinkPath);

    nodeRect
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0);

    labelG.attr("transform", (d) => {
      const x =
        d.category === "Revenue" ? d.x0 - textOffset : d.x1 + textOffset;
      return `translate(${x},${(d.y0 + d.y1) / 2})`;
    });
  }
}

// https://observablehq.com/@enjalot/weird-sankey-links
function sankeyLinkPath(link) {
  // this is a drop in replacement for d3.sankeyLinkHorizontal()
  // well, without the accessors/options
  let sx = link.source.x1;
  let tx = link.target.x0 + 1;
  let sy0 = link.y0 - link.width / 2;
  let sy1 = link.y0 + link.width / 2;
  let ty0 = link.y1 - link.width / 2;
  let ty1 = link.y1 + link.width / 2;

  let offset = 0;
  let halfx = (tx - sx) / 2;

  let path = d3.path();
  path.moveTo(sx, sy0);

  let cpx1 = sx + halfx;
  let cpy1 = sy0 + offset;
  let cpx2 = sx + halfx;
  let cpy2 = ty0 - offset;
  path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, tx, ty0);
  path.lineTo(tx, ty1);

  cpx1 = sx + halfx;
  cpy1 = ty1 - offset;
  cpx2 = sx + halfx;
  cpy2 = sy1 + offset;
  path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, sx, sy1);
  path.lineTo(sx, sy0);
  return path.toString();
}
