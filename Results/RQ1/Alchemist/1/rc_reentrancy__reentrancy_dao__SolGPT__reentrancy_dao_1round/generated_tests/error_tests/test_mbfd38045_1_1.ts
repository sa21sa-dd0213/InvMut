import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should detect the mutant that changes > to < in withdrawAll", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from user
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).deposit({ value: depositAmount });

    // Verify initial credit
    expect(await instance.credit(user.address)).to.equal(depositAmount);

    // Attempt withdrawal
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    // After withdrawal, credit should be 0 and contract balance should be 0
    expect(await instance.credit(user.address)).to.equal(0);
    expect(await ethers.provider.getBalance(instance.target)).to.equal(0);
  });
});