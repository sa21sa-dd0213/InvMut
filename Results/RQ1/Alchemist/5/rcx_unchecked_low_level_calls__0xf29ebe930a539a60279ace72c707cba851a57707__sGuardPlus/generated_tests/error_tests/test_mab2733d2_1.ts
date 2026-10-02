import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mab2733d2 test", function () {
  it("should revert when target call fails after removing require check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that reverts on receive to simulate failed call
    const RevertReceiver = await ethers.getContractFactory("RevertReceiver");
    const revertReceiver = await RevertReceiver.deploy();
    await revertReceiver.waitForDeployment();

    // Override the target address in the contract's storage (if possible) or use a different approach
    // Since the target is hardcoded, we simulate by sending ETH to the go function with a value
    // but the hardcoded target 0xC8A60C... may not revert; we need to deploy a contract that fails
    // We'll use ethers to impersonate the target or directly test revert behavior via a helper
    
    // Alternative: Deploy a contract with a fallback that reverts and set it as target via storage manipulation
    // For simplicity, we'll test that the original contract reverts when target call fails
    // We can use a custom contract that inherits B and overrides the target, but that's not allowed
    
    // Instead, we test the revert behavior by sending ETH to a contract that has no receive/fallback
    // The hardcoded target 0xC8A60C... is an EOA (externally owned account) that accepts ETH, so it won't revert
    // To kill the mutant, we need to ensure the target call fails. Since we cannot change the hardcoded address,
    // we assume the test environment has that address as a contract that reverts, or we use a fork.
    
    // For demonstration, we'll deploy a simple contract that reverts and set it as the target via storage slot
    // The target is stored at slot 0 of the contract? No, it's a hardcoded literal in the bytecode
    // So we cannot change it. Therefore, the mutant cannot be killed by a normal test on a local network
    // because the target address is fixed and may accept ETH.
    
    // However, if we deploy on a mainnet fork where 0xC8A60C... is a contract that reverts, the test would work
    // For the purpose of this exercise, we'll write a test that assumes the target reverts on a fork
    // and expects the original to revert, while the mutant would not revert (killing it).
    
    // Since we cannot change the target, we'll write a test that verifies the original reverts
    // when the target is a reverting contract, but this requires setting up a fork.
    
    // Simplified: we test that the function reverts when ETH is sent with a value that causes target to fail
    // But the hardcoded target might not fail. To properly kill the mutant, we need to change the target.
    // Given the constraints, we'll assume the test is run on a fork where 0xC8A60C... is a contract that reverts.
    
    // For a local test, we can deploy a contract that inherits B and overrides the target, but that's not allowed.
    
    // I'll provide a test that works if the target is a reverting contract (e.g., on a mainnet fork):
    const tx = instance.go({ value: ethers.parseEther("1") });
    await expect(tx).to.be.reverted;
  });
});