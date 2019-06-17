import React from "react";
import NodeElement from "./nodes/NodeElement";
import { Node,  NodeId, BuilderContextState, PlaceholderInfo, BuilderState } from "~types";
import DragDropManager from "./dnd";
import BuilderContext from "./BuilderContext";
import RenderNodeWithContext from "./render/RenderNodeWithContext";
import { makePropsReactive, mapChildrenToNodes, nodesToTree, getDeepChildrenNodes } from "./utils";

export default class Builder extends React.Component<any> {
  nodesInfo = {};
  state: BuilderState = {
    nodes: {},
    hover:null,
    active: null,
    dragging: null,
    placeholder: null,
  }
  constructor(props: any) {
    super(props);
    (window as any).tree = this.state;
    (window as any).info = this.nodesInfo;
    (window as any).deep = (nodeId: NodeId) => getDeepChildrenNodes(this.state.nodes, nodeId);
    (window as any).save = this.saveState.bind(this);
    (window as any).test = nodesToTree;
  }

  setNodes = (nodes?: Function) => {
    this.setState((draft: BuilderContextState) => {
      const fn = nodes && nodes(draft.nodes);
      draft.nodes = fn ? fn : draft.nodes;
      makePropsReactive(draft.nodes, () => this.setNodes());
      return draft;
    });
  }

  setNodeState = (state: string, id: NodeId) => {
    if ( !["active", "hover", "dragging"].includes(state) ) throw new Error(`Undefined state "${state}, expected either "active", "hover" or "dragging".`);
    if ( id && !this.state.nodes[id] ) throw new Error(`Node ${id} not found.`);
    console.log("state", state, id)
    this.setState({
      [state]: this.state.nodes[id]
    })
  }

  setPlaceholder = (placeholder: PlaceholderInfo) => {
    this.setState({
      placeholder
    });
  }

  saveState() {
    return Object.keys(this.state.nodes).reduce((result: any, nodeId) => {
      const node: Node = { ...this.state.nodes[nodeId] };
      node.name = typeof node.type === "function" ? node.type.name : (node.type as string);

      const JSXToNode = ((children: React.ReactNode) => {
        return React.Children.toArray(children).map((child: React.ReactElement, i) => {
          if (typeof child === "string") return child;
          const { type, props } = child;
          const { children, ...otherProps } = props;
          if (children) {
            otherProps.children = JSXToNode(children);
          }
          return {
            type: typeof type === "function" ? type.name : type,
            props: otherProps
          }
        })
      });

      if (node.props.children) {
        const { children, ...otherProps } = node.props;
        delete node.props;
        node.props = {
          ...otherProps,
          children: JSXToNode(React.Children.toArray(children))
        }
      }

      result[node.id] = node;
      return result;
    }, {});
  }


  componentDidMount() {
    // window.addEventListener("mouseover", e => {
    //   if ( this.state.hover ) this.setNodeState("hover", null);
    // });
    // window.addEventListener("mousedown", e => {
    //   if ( this.state.active) this.setNodeState("active", null);
    // })
  }
  render() {
    const { setNodes, setNodeState, setPlaceholder } = this;
    (window as any).tree = this.state;
    return (
      <BuilderContext.Provider value={{
        ...this.state,
        nodesInfo: this.nodesInfo,
        setNodes,
        setNodeState,
        setPlaceholder
      }}>
        <DragDropManager>
          {this.props.children}
        </DragDropManager>
      </BuilderContext.Provider>
    )
  }
}