import Stripe from 'stripe';
import { env } from './env';

let client: Stripe | undefined;
export const stripe = () => (client ??= new Stripe(env('STRIPE_SECRET_KEY')));

export const retrieveCheckoutSession = (id: string) =>
  stripe().checkout.sessions.retrieve(id, { expand: ['discounts.promotion_code'] });
