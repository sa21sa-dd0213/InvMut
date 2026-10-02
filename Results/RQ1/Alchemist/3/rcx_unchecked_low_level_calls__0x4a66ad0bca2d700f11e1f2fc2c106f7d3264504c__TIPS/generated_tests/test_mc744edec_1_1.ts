import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - return true removal", function () {
  it("should kill mutant by expecting return value of true from transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The from address is hardcoded in the contract as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use the owner account that matches this address or impersonate it
    // For testing, we'll use the owner as the sender (assuming it's the hardcoded address)

    // Prepare test data
    const tos = [addr1.address];
    const values = [1]; // 1 token

    // Call transfer function
    const tx = await instance.connect(owner).transfer(tos, values);
    await tx.wait();

    // The original returns true, the mutant returns false (default)
    // We need to check the return value of the function call
    const result = await instance.connect(owner).transfer.staticCall(tos, values);

    // Assert that the return value is true (original behavior)
    // The mutant will return false, causing this assertion to fail and "kill" the mutant
    expect(result).to.equal(true);
  });
});