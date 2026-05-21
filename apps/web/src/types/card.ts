export interface CardAbility {
  name: string;
  description: string;
}

export interface PricePoint {
  timestamp: number;
  price: string;
}

export interface CardHolder {
  address: string;
  balance: number;
  username?: string;
}
