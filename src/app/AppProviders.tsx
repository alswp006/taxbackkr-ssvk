import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import * as taxService from "@/services/taxService";
import * as sessionService from "@/services/sessionService";

/**
 * 페이지가 소비하는 단일 서비스 계약.
 *
 * 병합된 세금 계산 파사드(0005)와 세션/리워드 서비스(0006)를 context로 노출한다.
 * 페이지는 이 모듈을 직접 import하지 말고 useServices()로 주입받아 테스트에서
 * 손쉽게 대체할 수 있게 한다.
 */
export interface Services {
  taxService: typeof taxService;
  sessionService: typeof sessionService;
}

const services: Services = { taxService, sessionService };

const ServicesContext = createContext<Services>(services);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
  );
}

export function useServices(): Services {
  return useContext(ServicesContext);
}
