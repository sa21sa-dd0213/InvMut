import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m665adfa8", function () {
  it("should kill mutant that reverses block number comparison in play()", async function () {
    const [owner, player] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1.0");
    
    // Deploy contract with required constructor arguments
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Set difficulty so that winning condition is achievable
    await instance.connect(owner).AdjustDifficulty(2);
    
    // Player places a wager
    const wagerTx = await instance.connect(player).wager({ value: wagerLimit });
    await wagerTx.wait();
    
    // Wait for at least one block to pass
    await ethers.provider.send("evm_mine", []);
    
    // On original: play() should succeed (blockNumber < block.number)
    // On mutant: play() will revert (blockNumber > block.number is false)
    await expect(
      instance.connect(player).play()
    ).to.not.be.reverted;
  });
});