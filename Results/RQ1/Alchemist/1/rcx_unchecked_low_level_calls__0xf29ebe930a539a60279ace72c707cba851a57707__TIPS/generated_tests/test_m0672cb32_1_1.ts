import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m0672cb32 test", function () {
  it("should revert when external call fails and balance should not be transferred", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get initial balance of owner
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // The target address (0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C) likely has no code on most networks,
    // so the call will fail. The original contract should revert, but the mutant should not.
    // We'll attempt to call go() and expect it to revert
    await expect(
      instance.connect(attacker).go({ value: ethers.parseEther("0.1") })
    ).to.be.reverted;

    // Verify owner balance hasn't changed (no transfer happened)
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance);

    // Verify contract still has its funds
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(fundAmount);
  });
});