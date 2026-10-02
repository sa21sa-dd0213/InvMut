import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - onlyOwner modifier inversion", function () {
  it("should revert when owner calls OpenToThePublic due to mutant inverting access control", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with required constructor arguments: whaleAddress, wagerLimit
    const whaleAddress = addr2.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // This means only non-owners can call onlyOwner functions
    // When the actual owner calls OpenToThePublic, it should revert in the mutant
    // because msg.sender (owner) != owner would be false
    
    await expect(
      instance.connect(owner).OpenToThePublic()
    ).to.be.reverted;
  });
});