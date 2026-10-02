import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant where deposit adds msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Try to withdraw all - this should succeed on original but fail on mutant
    // because mutant would credit 2 wei while only 1 wei was deposited
    await expect(instance.connect(addr1).withdrawAll()).to.be.reverted;
  });
});