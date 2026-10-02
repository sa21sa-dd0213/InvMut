import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m89187fec - division instead of subtraction", function () {
  it("should detect when pot is not divisible by fee amount", async function () {
    const [owner, player] = await ethers.getSigners();
    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;
    
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First play: player wins (random == 0) with pot = 10
    // In original: player gets 10 - 1 = 9 wei
    // In mutant: player gets 10 / 1 = 10 wei (different amount)
    
    // We need to ensure the player wins (random == 0)
    // We can manipulate block.timestamp and block.difficulty to control randomness
    // For simplicity, we'll play multiple times until the player wins
    
    let playerWon = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!playerWon && attempts < maxAttempts) {
      attempts++;
      
      // Get initial balances
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      
      // Play the lottery
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      // Calculate gas cost
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      
      // Check if player won by seeing if pot was reset
      const potAfter = await instance.pot();
      
      if (potAfter === 0n) {
        // Player won - check the transfer amount
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        const actualTransfer = playerBalanceAfter - (playerBalanceBefore - TICKET_AMOUNT - gasCost);
        
        // In original: player should receive 9 wei (pot - fee)
        // In mutant: player receives 10 wei (pot / fee)
        // The mutant will give 10 wei instead of 9 wei
        expect(actualTransfer).to.equal(10n); // This will pass on mutant, fail on original
        
        // Verify the owner got the fee
        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
        const ownerReceived = ownerBalanceAfter - ownerBalanceBefore;
        expect(ownerReceived).to.equal(FEE_AMOUNT); // Fee should be 1 wei
        
        playerWon = true;
      }
    }
    
    expect(playerWon).to.be.true; // Ensure we got a winning scenario
  });
});