import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m88fb2d50 test", function () {
  it("should kill the mutant by checking that withdrawAll transfers Ether when credit > 0", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(user).deposit({ value: depositAmount });

    const userBalanceBefore = await ethers.provider.getBalance(user.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // Original contract: user balance increases by deposit minus gas, contract balance decreases
    // Mutant: user balance unchanged, contract balance unchanged
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);
    expect(contractBalanceAfter).to.be.lt(contractBalanceBefore);
  });
});