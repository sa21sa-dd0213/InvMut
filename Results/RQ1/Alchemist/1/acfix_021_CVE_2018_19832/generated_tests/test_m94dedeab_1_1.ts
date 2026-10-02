import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant detection - approve function", function () {
  it("should detect mutant m94dedeab by calling approve with non-zero value when allowance is zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr2 to spend 100 tokens from owner, when allowance is initially 0
    const tx = await instance.connect(owner).approve(addr2.address, ethers.parseEther("100"));
    const receipt = await tx.wait();

    // On the original contract, this should return true (success)
    // On the mutant, it always returns false, so we check the event was emitted
    await expect(tx)
      .to.emit(instance, "Approval")
      .withArgs(owner.address, addr2.address, ethers.parseEther("100"));

    // Additionally verify that the allowance was actually set
    const allowance = await instance.allowance(owner.address, addr2.address);
    expect(allowance).to.equal(ethers.parseEther("100"));
  });
});