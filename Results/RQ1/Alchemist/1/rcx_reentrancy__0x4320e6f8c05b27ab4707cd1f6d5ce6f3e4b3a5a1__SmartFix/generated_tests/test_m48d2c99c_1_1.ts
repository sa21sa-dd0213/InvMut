import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test - m48d2c99c", function () {
  it("should kill the mutant by withdrawing less than full balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy ACCURAL_DEPOSIT (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to a small value (e.g., 0.1 ether) to allow withdrawals
    await instance.SetMinSum(ethers.parseEther("0.1"));

    // Initialize the contract
    await instance.Initialized();

    // User deposits 2 ether
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Deposit({ value: depositAmount });

    // Verify balance is 2 ether
    expect(await instance.balances(user.address)).to.equal(depositAmount);

    // User attempts to collect only 1 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("1");

    // On the mutant, this should revert because balances[msg.sender] (2 ether) != _am (1 ether)
    // On the original, this should succeed because balances[msg.sender] >= _am
    await expect(
      instance.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;

    // Additional verification: balance should remain unchanged after failed attempt
    expect(await instance.balances(user.address)).to.equal(depositAmount);
  });
});