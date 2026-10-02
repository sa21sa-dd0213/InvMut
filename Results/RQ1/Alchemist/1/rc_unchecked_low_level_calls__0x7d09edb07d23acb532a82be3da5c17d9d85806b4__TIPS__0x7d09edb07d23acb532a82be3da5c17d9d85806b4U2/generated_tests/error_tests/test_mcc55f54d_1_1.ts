import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - mcc55f54d", function () {
  it("should revert when play() is called by an address that has NOT wagered (mutant fails to revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const whaleAddress = addr2.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public so addr1 can interact
    await instance.connect(owner).OpenToThePublic();
    
    // addr1 calls play() WITHOUT having called wager() first
    // In the original contract, this should revert because wagers[addr1] == 0, which is NOT > 0
    // In the mutant, require(wagers[msg.sender] >= 0) will pass even when wagers[addr1] == 0
    await expect(
      instance.connect(addr1).play()
    ).to.be.reverted;
  });
});