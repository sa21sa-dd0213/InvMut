import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mab2733d2", function () {
  it("should revert when external call fails (mutant removed require)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH so it has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Make the target address non-payable by setting it to a random EOA
    // The target is hardcoded in the contract, we can't change it,
    // but we can simulate a failed call by having the contract selfdestruct
    // or by setting the target to an address that rejects calls.
    // Since we cannot modify the hardcoded address, we instead
    // use the fact that the target might not be a contract.
    // However, for reliable testing, we need to ensure the call fails.
    // We'll deploy a contract that reverts on receive at that exact address
    // by using CREATE2 or by setting up the target beforehand.
    
    // Alternative approach: Since we control the blockchain state,
    // we can set the target address to be a contract that always reverts
    // by deploying to that specific address using CREATE2 with known salt.
    
    // Deploy a receiver that always reverts at the target address
    const revertReceiverFactory = await ethers.getContractFactory("RevertReceiver");
    const revertReceiver = await ethers.deployContract("RevertReceiver");
    await revertReceiver.waitForDeployment();
    
    // Get the hardcoded target from the contract bytecode or just use it
    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    
    // If the target is not our revert receiver, we need to force the issue
    // Since we can't change the hardcoded address, we'll test differently:
    // Send ETH to the contract, then call go() - the call will succeed or fail
    // depending on the target's state. For a real test, we'd need the target
    // to be a contract that reverts.
    
    // Actually, the simplest approach: call go() with 0 value and expect revert
    // because the external call to a non-contract address will succeed (no code)
    // and the require would pass. Instead, let's test with a value and ensure
    // the target address has no receive function by checking its code.
    
    // Best approach: Since we cannot change the hardcoded address,
    // we'll test the mutant by calling go() with some ETH and checking
    // that the contract's balance becomes zero even if the call "fails"
    // (which for an EOA it doesn't fail, it succeeds silently).
    // The mutant would still work if target is EOA.
    
    // To reliably kill the mutant, we need to make the external call fail.
    // We'll deploy a contract that selfdestructs, then call go().
    // But we can't change the target address...
    
    // Final approach: Use the fact that we can impersonate or set code at
    // the target address using hardhat_setCode or similar.
    // In Hardhat, we can use network.provider.send to set the code.
    
    await ethers.provider.send("hardhat_setCode", [
      targetAddress,
      "0x" // Empty code makes it an EOA, calls succeed
    ]);
    
    // Actually, let's take a different approach. We'll test the original behavior:
    // The original requires the call to succeed. If the target is an EOA,
    // the call succeeds. So we need to make it a contract that reverts.
    
    // Deploy a simple reverting contract at the target address using create2
    const RevertFactory = await ethers.getContractFactory("RevertOnReceive");
    // We need to deploy to the exact address - use deterministic deployment
    // But for simplicity, let's just use hardhat_setCode to set a reverting contract
    const revertBytecode = "0x60806040526004361060255760003560e01c80633ccfd60b1460275760015b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600a602482015269139bdd08185b1b1bddd95960b21b6044820152606490fd5b005b600080fdfea2646970667358221220a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a64736f6c63430008120033";
    await ethers.provider.send("hardhat_setCode", [targetAddress, revertBytecode]);
    
    // Now the target will revert on any call
    const contractAddress = await instance.getAddress();
    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    
    // Call go() - should revert because the external call fails
    await expect(
      instance.connect(owner).go({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
    
    // Verify contract still has its balance (no transfer happened)
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter).to.equal(balanceBefore);
    
    // Cleanup: restore original code at target address
    await ethers.provider.send("hardhat_setCode", [targetAddress, "0x"]);
  });
});