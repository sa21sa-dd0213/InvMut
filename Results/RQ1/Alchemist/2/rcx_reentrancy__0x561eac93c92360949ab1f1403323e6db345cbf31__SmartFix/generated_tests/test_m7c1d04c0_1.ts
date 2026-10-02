import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m7c1d04c0", function () {
  it("should detect the mutant by calling Deposit with positive msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit with 1 wei should succeed on original, revert on mutant
    const tx = instance.connect(addr1).Deposit({ value: ethers.parseEther("0.000000000000000001") });
    await expect(tx).to.be.reverted;
  });
});