import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should allow owner to call onlyOwner function; mutant fails because require(msg.sender != owner) reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The owner should be able to call withdraw() successfully in the original contract
    // In the mutant, this will revert because require(msg.sender != owner) blocks the owner
    await expect(instance.connect(owner).withdraw()).to.not.be.reverted;
  });
});