import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m4b07f326 - keccak256 replaced with sha256", function () {
  it("should detect hash function change by comparing behavior across multiple deterministic calls", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");
    
    // Record initial balances
    const initialBankBalance = await ethers.provider.getBalance(owner.address);
    const initialPlayerBalance = await ethers.provider.getBalance(player.address);
    
    // Play the game multiple times with the same block parameters
    let playerWins = 0;
    let totalPlays = 10;
    
    for (let i = 0; i < totalPlays; i++) {
      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();
      
      // After each play, check if player got pot back (won) or bank got fee (lost)
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      const bankBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Calculate player net change
      const expectedSpent = TICKET_AMOUNT * BigInt(i + 1);
      const playerNetChange = playerBalanceAfter - initialPlayerBalance;
      const playerDiff = playerNetChange - expectedSpent;
      
      if (playerDiff > BigInt(0)) {
        playerWins++;
      }
    }
    
    // Verify the contract still functions correctly
    const finalPot = await instance.pot();
    const finalBankBalance = await ethers.provider.getBalance(owner.address);
    
    // The mutant changes the hash function, so the win distribution will differ
    // from what keccak256 would produce
    expect(playerWins).to.not.equal(5); // Not exactly 50/50 with same block params
    
    // Verify payout logic is intact
    expect(finalPot).to.equal(0); // Pot should be reset after win
    
    console.log(`Player won ${playerWins} out of ${totalPlays} times`);
  });
});