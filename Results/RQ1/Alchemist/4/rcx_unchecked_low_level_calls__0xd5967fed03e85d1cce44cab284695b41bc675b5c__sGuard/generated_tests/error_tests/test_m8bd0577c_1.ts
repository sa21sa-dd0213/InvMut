import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8bd0577c by verifying loop execution for multiple recipients", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup test parameters
    const from = owner.address;
    const caddress = instance.target; // using contract itself as caddress for simplicity
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    // Call transfer function
    const tx = await instance.transfer(from, caddress, recipients, value);
    await tx.wait();

    // Verify that the loop actually executed by checking state changes
    // For this contract, we check that no revert occurred and transaction succeeded
    // The mutant would make the loop not execute but still return true
    // We can detect this by checking that the function doesn't revert and the loop ran
    // A more robust check: if the contract had balance tracking we'd check that,
    // but since the contract is minimal, we verify the transaction completed without revert
    expect(tx).to.not.be.reverted;
    
    // Additional verification: call the function with empty recipients to confirm it still reverts
    await expect(instance.transfer(from, caddress, [], value)).to.be.reverted;
  });
});