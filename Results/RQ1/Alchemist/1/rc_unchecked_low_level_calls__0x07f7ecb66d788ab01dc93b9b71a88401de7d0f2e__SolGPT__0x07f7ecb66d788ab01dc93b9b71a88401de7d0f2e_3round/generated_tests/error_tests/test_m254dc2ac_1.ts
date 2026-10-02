import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - onlyPlayers modifier", function () {
  it("should revert when calling play() without having wagered first", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1");
    const whaleAddress = owner.address;
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, betLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await (await instance.connect(owner).OpenToThePublic()).wait();
    
    // Set difficulty to avoid division by zero
    await (await instance.connect(owner).AdjustDifficulty(10)).wait();
    
    // addr1 tries to call play() without first calling wager()
    // This should revert because onlyPlayers modifier checks wagers[msg.sender] > 0
    await expect(
      instance.connect(addr1).play()
    ).to.be.reverted;
  });
});