import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m51c35cde detection", function () {
  it("should detect mutant by verifying player never receives payout when condition is false", async function () {
    const [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const ticketAmount = ethers.parseEther("10");
    const feeAmount = ethers.parseEther("1");
    
    // Get initial balances
    const initialPlayerBalance = await ethers.provider.getBalance(player1.address);
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    // Player1 plays once
    const tx1 = await instance.connect(player1).play({ value: ticketAmount });
    await tx1.wait();
    
    // Check contract balance increased by full ticket amount (no payout happened)
    const contractBalanceAfterFirst = await ethers.provider.getBalance(instance.target);
    expect(contractBalanceAfterFirst).to.equal(initialContractBalance + ticketAmount);
    
    // Check player balance decreased by ticket amount (no payout received)
    const playerBalanceAfterFirst = await ethers.provider.getBalance(player1.address);
    // Player lost exactly ticket amount (plus gas costs)
    expect(playerBalanceAfterFirst).to.be.lessThan(initialPlayerBalance - ticketAmount + ethers.parseEther("0.001"));
    
    // Player2 plays - should also never get payout in mutant
    const initialPlayer2Balance = await ethers.provider.getBalance(player2.address);
    const tx2 = await instance.connect(player2).play({ value: ticketAmount });
    await tx2.wait();
    
    // Contract balance should now have 2 ticket amounts
    const contractBalanceAfterSecond = await ethers.provider.getBalance(instance.target);
    expect(contractBalanceAfterSecond).to.equal(initialContractBalance + ticketAmount * 2n);
    
    // Player2 should also have lost money (no payout)
    const player2BalanceAfter = await ethers.provider.getBalance(player2.address);
    expect(player2BalanceAfter).to.be.lessThan(initialPlayer2Balance - ticketAmount + ethers.parseEther("0.001"));
    
    // Verify pot matches accumulated balance
    const pot = await instance.pot();
    expect(pot).to.equal(ticketAmount * 2n);
  });
});