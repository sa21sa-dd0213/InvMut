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

    // Deploy a contract that always reverts at the hardcoded caddress
    // First, get the bytecode of a simple reverting contract
    const revertingFactory = await ethers.getContractFactory("RevertingContract");
    const revertingContract = await revertingFactory.deploy();
    await revertingContract.waitForDeployment();
    
    // Use hardhat_setStorageAt to change the caddress storage slot
    // The storage slot for caddress is slot 1 (since from is slot 0)
    const slot = "0x0000000000000000000000000000000000000000000000000000000000000001";
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      "0x000000000000000000000000" + (await revertingContract.getAddress()).slice(2)
    ]);

    // Also need to set the from address to match the owner's address in storage slot 0
    const fromSlot = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      fromSlot,
      "0x000000000000000000000000" + owner.address.slice(2)
    ]);

    // Now test with a valid transfer call - it should revert because the external call fails
    const tos = [owner.address]; // Use a valid address
    const v = [1]; // Any value

    // The call should revert because the external call to the reverting contract fails
    await expect(
      instance.connect(owner).transfer(tos, v)
    ).to.be.reverted;
  });
});