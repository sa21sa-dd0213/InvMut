import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m1a38ebcd", function () {
  it("should revert when _tos array is empty in original, but pass in mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the from address matches the deployer (owner) to pass msg.sender check
    const fromAddress = await instance.from();
    expect(fromAddress.toLowerCase()).to.equal(owner.address.toLowerCase());

    // Test with empty _tos array and empty v array
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // This transaction should revert on the original (length > 0 fails)
    // but succeed on the mutant (length >= 0 always passes)
    const tx = instance.transfer(emptyAddresses, emptyValues);
    
    // The mutant would pass this test, so we expect a revert to kill it
    await expect(tx).to.be.reverted;
  });
});