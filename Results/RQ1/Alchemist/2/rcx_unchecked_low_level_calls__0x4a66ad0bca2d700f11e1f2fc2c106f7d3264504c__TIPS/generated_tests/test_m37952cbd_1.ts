import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m37952cbd test", function () {
  it("should revert when external call fails, but mutant does not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the from address matches the deployer
    const fromAddress = await instance.from();
    expect(fromAddress).to.equal(owner.address);

    // We need to cause the transferFrom call to fail.
    // The contract calls caddress (0x1f844685f7Bf86eFcc0e74D8642c54A257111923) with transferFrom selector.
    // If we deploy a contract at that address that always reverts, the call will fail.
    // However, we cannot deploy at a specific address easily in Hardhat.
    // Alternative: use an invalid token address or a call that reverts due to insufficient allowance.
    // Since caddress is hardcoded, we can set up a simple contract at that address using vm.etch or similar.
    
    // For this test, we'll use a different approach: call with a v value that causes overflow or invalid transfer.
    // Actually, the simplest is to make the external call fail by having the caddress be a contract that reverts.
    // We'll deploy a reverting contract and then use setStorageAt to change caddress storage slot.
    // But that's complex. Instead, we can test with a v[i] = 0 and a _tos[i] that is the zero address.
    // The transferFrom call will likely revert because sending to zero address or with zero value may fail.
    
    // Let's try a simpler approach: use a v[i] that is very large to cause an arithmetic overflow in the multiplication.
    // The multiplication v[i] * 1000000000000000000 could overflow for large v[i].
    // Since Solidity 0.8.x has built-in overflow checks, this will cause the external call to revert.
    // But the external call is to caddress which is a fixed address - we need that address to be a contract that handles the call.
    
    // The most reliable method: we can simulate the test by calling from the authorized address (owner).
    // We'll send a transaction that should revert in the original but not in the mutant.
    // Since caddress is a fixed address that may not be a contract, the call will return false.
    // In the original, if (!_s) will revert. In the mutant, if(false) will not revert.
    
    // Use _tos with a valid address and v with a value that causes the call to fail.
    // The call to a non-existent contract address (no code) will return success=false.
    
    const tos = [ethers.ZeroAddress]; // address(0) as recipient
    const v = [1]; // any value

    // The call should revert in the original contract, but not in the mutant
    await expect(
      instance.connect(owner).transfer(tos, v)
    ).to.be.reverted; // In the mutant, this will NOT revert, so the test will fail - killing the mutant
  });
});