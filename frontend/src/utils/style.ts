import { useEffect, useMemo } from 'react'
import { createChangeableStyle } from '../utils/css'

// a component that uses createChangeableStyle
export function useStyleSheet(style: string) {
  const changeableStyle = useMemo(()=>createChangeableStyle(), []);
  useEffect(()=>{
    return ()=>changeableStyle.remove();
  },[])
  changeableStyle.setStyle(style);
}
