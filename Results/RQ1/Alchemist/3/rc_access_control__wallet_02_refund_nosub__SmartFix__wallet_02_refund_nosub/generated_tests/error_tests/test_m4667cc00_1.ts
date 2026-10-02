import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - migrateTo authorization", function () {
  it("should allow creator to call migrateTo and transfer contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Get contract balance before migration
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalanceBefore).to.equal(depositAmount);

    // Creator (owner) calls migrateTo - should succeed in original, revert in mutant
    await instance.connect(owner).migrateTo(addr1.address);

    // Verify the balance was transferred to addr1
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceAfter).to.equal(depositAmount);

    // Verify contract balance is now zero
    const contractBalanceAfter = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalanceAfter).to.equal(0);
  });
});