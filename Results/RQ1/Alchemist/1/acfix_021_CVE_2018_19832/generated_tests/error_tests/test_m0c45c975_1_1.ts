import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - onlyPayloadSize modifier", function () {
  it("should revert when calling transfer with correct payload size (original should pass, mutant should fail)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund owner with some tokens for transfer test
    // The contract sets owner balance via NETM() function (callable only by owner)
    await instance.NETM();

    const transferAmount = ethers.parseEther("1");
    
    // Call transfer with standard parameters - this should succeed in original
    // because msg.data.length will be >= 68 (2*32 + 4), but mutant asserts <=
    // which will cause revert when data length equals exactly 68
    await expect(
      instance.connect(owner).transfer(addr1.address, transferAmount)
    ).to.be.reverted; // Mutant reverts, original passes
  });
});