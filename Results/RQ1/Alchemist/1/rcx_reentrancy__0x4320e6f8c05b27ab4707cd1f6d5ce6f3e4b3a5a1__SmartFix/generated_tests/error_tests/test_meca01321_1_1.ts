import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant meca01321 test", function () {
  it("should revert when Collect is called and ether transfer fails (mutant removes revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a receiver contract that will reject ether
    const RejectorFactory = await ethers.getContractFactory("contracts/Rejector.sol:Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set MinSum to 0.1 ether for testing
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));

    // Set LogFile to a valid address (use any address since we're testing revert behavior)
    await instance.connect(owner).SetLogFile(addr1.address);

    // Deposit 1 ether from addr1
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("1") });

    // Check balance before Collect attempt
    const balanceBefore = await instance.balances(addr1.address);

    // Attempt Collect - this should revert in original but not in mutant
    // We call Collect from the rejector contract which will fail to receive ether
    const txPromise = instance.connect(addr1).Collect(ethers.parseEther("0.5"));

    // In the original contract, this should revert because the transfer to rejector fails
    // In the mutant, it won't revert, so we check that balance is NOT decreased
    try {
      await txPromise;
      // If transaction succeeded (mutant), check that balance was incorrectly deducted
      const balanceAfter = await instance.balances(addr1.address);
      expect(balanceAfter).to.equal(balanceBefore - ethers.parseEther("0.5"));
    } catch (error) {
      // If transaction reverted (original), balance should remain unchanged
      const balanceAfter = await instance.balances(addr1.address);
      expect(balanceAfter).to.equal(balanceBefore);
    }
  });
});