import type { APIRoute } from 'astro';
import { indiceBusqueda } from '../scripts/datos';
export const GET: APIRoute = () => new Response(JSON.stringify(indiceBusqueda()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
