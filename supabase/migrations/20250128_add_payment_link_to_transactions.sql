/*
  # Add payment_link_id to transactions

  1. Changes
    - Add `payment_link_id` column to link transactions to payment links
    - Add foreign key constraint
    - Add index for performance
    
  2. Purpose
    - When payment link is paid, webhook can find and update the existing transaction
    - Prevents duplicate transactions
*/

-- Add payment_link_id column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_link_id uuid REFERENCES payment_links(id) ON DELETE SET NULL;

-- Add index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_transactions_payment_link_id 
ON transactions(payment_link_id) 
WHERE payment_link_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN transactions.payment_link_id IS 
'ID of the payment link that created this transaction (for webhook updates)';
