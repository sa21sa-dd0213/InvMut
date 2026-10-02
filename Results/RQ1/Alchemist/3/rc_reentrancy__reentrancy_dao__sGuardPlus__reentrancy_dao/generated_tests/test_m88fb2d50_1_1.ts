import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should kill mutant m88fb2d50 by verifying withdrawal succeeds when credit > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    const withdrawTx = await instance.connect(addr1).withdrawAll();
    await withdrawTx.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // In the original, contract balance decreases and user balance increases
    // In the mutant (if false), nothing happens - balances remain the same
    // We expect the withdrawal to have occurred, so balances must differ
    expect(contractBalanceAfter).to.be.lessThan(contractBalanceBefore);
    expect(addr1BalanceAfter).to.be.greaterThan(addr1BalanceBefore);
  });
});