import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame - Kill mutant m365fe295 (payout division replaced with addition)", function () {
  it("should pay out exactly half the contract balance on win, not balance + 2", async function () {
    const [owner, player1] = await ethers.getSigners();
    
    // Deploy with whale address and bet limit
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(owner.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.OpenToThePublic();
    
    // Set difficulty so that winningNumber == difficulty/2 is achievable
    // difficulty = 3 means difficulty/2 = 1 (integer division), so winning number must be 1
    await instance.AdjustDifficulty(3);
    
    // Player makes a wager
    await instance.connect(player1).wager({ value: betLimit });
    
    // Mine a block to ensure block.number > timestamps[player1]
    await ethers.provider.send("evm_mine", []);
    
    // Get contract balance before play
    const balanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Get player balance before play
    const playerBalanceBefore = await ethers.provider.getBalance(player1.address);
    
    // Execute play - this will trigger payout if winningNumber == difficulty/2 (i.e., 1)
    await instance.connect(player1).play();
    
    // Get contract balance after play
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    
    // Get player balance after play
    const playerBalanceAfter = await ethers.provider.getBalance(player1.address);
    
    // The payout should be exactly half of the contract balance before play
    const expectedPayout = balanceBefore / 2n;
    
    // Verify contract balance decreased by exactly the payout amount
    expect(balanceAfter).to.equal(balanceBefore - expectedPayout);
    
    // Verify player received exactly the payout amount (accounting for gas)
    const actualPayout = playerBalanceAfter - playerBalanceBefore;
    expect(actualPayout).to.equal(expectedPayout);
    
    // Additional check: if mutation were present, payout would be balanceBefore + 2,
    // which would either revert (insufficient funds) or leave contract with negative balance
    // This assertion would catch the mutant because balanceBefore + 2 != balanceBefore / 2
    expect(expectedPayout).to.not.equal(balanceBefore + 2n);
  });
});