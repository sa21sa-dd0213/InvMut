import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection", function () {
  it("should detect mutation: require using * instead of + in Deposit (zero value deposit after positive balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for ACCURAL_DEPOSIT)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit: send 1 ether to create a positive balance
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("1") });

    // Verify balance is now 1 ether
    const balanceAfterFirstDeposit = await instance.balances(addr1.address);
    expect(balanceAfterFirstDeposit).to.equal(ethers.parseEther("1"));

    // Now attempt to deposit 0 ether - should succeed in original but revert in mutant
    // because original: balance + 0 >= balance (true), mutant: balance * 0 >= balance (false)
    await expect(
      instance.connect(addr1).Deposit({ value: 0 })
    ).to.be.reverted;
  });
});