import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test m4f3b3f02", function () {
  it("should revert when sending exact betLimit to wager() (mutant changes == to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = owner.address;
    const wagerLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public
    await instance.connect(owner).OpenToThePublic();
    
    // Attempt to wager with the exact betLimit value
    // Original: require(msg.value == betLimit) - should succeed
    // Mutant: require(msg.value != betLimit) - should revert
    await expect(
      instance.connect(addr1).wager({ value: wagerLimit })
    ).to.be.reverted;
  });
});