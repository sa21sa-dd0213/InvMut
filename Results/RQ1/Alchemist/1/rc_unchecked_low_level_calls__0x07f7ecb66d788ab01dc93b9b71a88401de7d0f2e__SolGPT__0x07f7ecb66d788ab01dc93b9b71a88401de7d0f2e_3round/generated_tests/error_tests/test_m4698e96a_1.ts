import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - m4698e96a", function () {
  it("should detect the mutant that replaces % with / in play() - no player can ever win", async function () {
    const [owner, player1, player2, player3] = await ethers.getSigners();
    const whaleAddress = ethers.Wallet.createRandom().address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Set difficulty to 10 so winning number is 5 (difficulty / 2)
    await instance.connect(owner).AdjustDifficulty(10);
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Fund contract with some ETH for potential payouts
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Multiple players place wagers and play
    const players = [player1, player2, player3];
    for (const player of players) {
      // Player wagers
      await instance.connect(player).wager({ value: wagerLimit });
      
      // Mine a block to advance block.number so play() doesn't revert
      await ethers.provider.send("evm_mine", []);
      
      // Player plays
      await instance.connect(player).play();
    }
    
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the original contract, at least some players might win and receive payouts
    // In the mutant with division, NO player can ever win because winningNumber will be 
    // a huge number (hash / difficulty) that can never equal difficulty/2
    // Therefore the contract balance should NOT decrease (no payouts)
    expect(finalContractBalance).to.equal(initialContractBalance);
    
    // Additional verification: all players should have lost (wagers reset to 0)
    for (const player of players) {
      expect(await instance.hasPlayerWagered(player.address)).to.be.false;
    }
  });
});