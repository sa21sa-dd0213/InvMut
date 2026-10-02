import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - deposit off-by-one", function () {
  it("should kill mutant by depositing 1 wei and verifying withdrawal fails", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from addr1
    const tx = await instance.connect(addr1).deposit({ value: 1 });
    await tx.wait();

    // Attempt to withdraw - should succeed on original but fail on mutant
    // because mutant records 0 credit for 1 wei deposit
    await expect(instance.connect(addr1).withdrawAll()).to.be.reverted;
  });
});