import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant by depositing 1 ether and verifying full withdrawal succeeds", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // Deposit 1 ether
    const tx = await instance.connect(owner).deposit({ value: depositAmount });
    await tx.wait();

    // Withdraw all - should succeed in original, but mutant will fail
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });
});