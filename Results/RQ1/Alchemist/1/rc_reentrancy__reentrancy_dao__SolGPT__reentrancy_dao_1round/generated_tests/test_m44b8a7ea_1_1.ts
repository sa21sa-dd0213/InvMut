import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea detection", function () {
  it("should detect balance inflation by depositing and verifying full withdrawal", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    // User withdraws all
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    // Check contract balance - should be exactly 0 if no inflation
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});