import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - betLimit / 2 vs betLimit - 2", function () {
  it("should detect mutant where loseWager uses betLimit - 2 instead of betLimit / 2", async function () {
    const [owner, whale, player] = await ethers.getSigners();
    
    // Deploy with a specific betLimit where betLimit/2 != betLimit-2
    const betLimit = ethers.parseEther("10");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty so that player loses (winning number != difficulty/2)
    // difficulty = 10 means winning number must be 5 to win, range is 1-10
    await instance.connect(owner).AdjustDifficulty(10);
    
    // Player makes a wager
    await instance.connect(player).wager({ value: betLimit });
    
    // Get initial whale balance
    const initialWhaleBalance = await ethers.provider.getBalance(whale.address);
    
    // Get initial totalDonated
    // Note: totalDonated is not public in the contract, so we'll use whale balance
    // Get initial contract balance
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    // Player plays and loses (we need to advance blocks so blockNumber < block.number)
    // Mine a new block to ensure the player can play
    await ethers.provider.send("evm_mine", []);
    
    // Play - should lose since difficulty is 10 and winningNumber is random
    await instance.connect(player).play();
    
    // Get final whale balance
    const finalWhaleBalance = await ethers.provider.getBalance(whale.address);
    const amountSentToWhale = finalWhaleBalance - initialWhaleBalance;
    
    // Original contract sends betLimit/2 = 5 ETH
    // Mutant sends betLimit - 2 = 8 ETH
    // If original: amountSentToWhale should equal betLimit/2
    const expectedOriginalAmount = betLimit / 2n;
    
    expect(amountSentToWhale).to.equal(expectedOriginalAmount);
  });
});