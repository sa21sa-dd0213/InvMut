import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mbfd38045", function () {
  it("should detect mutant that changes > to < in withdrawAll condition", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).deposit({ value: depositAmount });

    // Verify credit was recorded
    const creditBefore = await instance.credit(user.address);
    expect(creditBefore).to.equal(depositAmount);

    // User withdraws all
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    // Verify credit is zero after withdrawal
    const creditAfter = await instance.credit(user.address);
    expect(creditAfter).to.equal(0);

    // Verify balance is zero in the contract
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});