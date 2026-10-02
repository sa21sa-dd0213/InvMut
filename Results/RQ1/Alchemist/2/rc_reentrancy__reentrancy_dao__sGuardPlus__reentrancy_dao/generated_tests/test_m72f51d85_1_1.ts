import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should kill mutant m72f51d85 by detecting balance accounting inconsistency", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw all credited amount
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // Check contract balance - should be 0 in original, but mutant leaves 1 wei
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});