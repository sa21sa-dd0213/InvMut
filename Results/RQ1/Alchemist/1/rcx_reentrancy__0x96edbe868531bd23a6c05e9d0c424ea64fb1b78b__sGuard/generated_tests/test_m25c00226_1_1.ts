import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m25c00226 test", function () {
  it("should detect mutant that changes >= to > in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));

    // Initialize the contract
    await instance.Initialized();

    // Fund addr1 with exactly 1 ether (balance == MinSum)
    const tx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await tx.wait();

    // Verify the balance is exactly MinSum
    const account = await instance.Acc(addr1.address);
    expect(account.balance).to.equal(ethers.parseEther("1"));

    // Attempt to collect exactly 1 ether
    // In the original: balance >= MinSum (1 >= 1) is true -> should succeed
    // In the mutant: balance > MinSum (1 > 1) is false -> should revert
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});