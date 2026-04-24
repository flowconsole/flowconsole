import { Injectable } from '@angular/core';
import { UserService } from './user-service';
import { DatabaseService } from './database-service';

export class OrderController {
  constructor(private db: DatabaseService) {}

  processOrder(id: string): void {
    console.log('processing', id);
  }
}

export interface IPaymentProcessor {
  charge(amount: number): Promise<boolean>;
  refund(transactionId: string): Promise<void>;
}

export class PaymentService implements IPaymentProcessor {
  async charge(amount: number): Promise<boolean> {
    return true;
  }

  async refund(transactionId: string): Promise<void> {}
}

import express from 'express';
const router = express.Router();

router.get('/orders', (req, res) => {
  res.json([]);
});

router.post('/orders', (req, res) => {
  res.status(201).json({ id: 'new' });
});
