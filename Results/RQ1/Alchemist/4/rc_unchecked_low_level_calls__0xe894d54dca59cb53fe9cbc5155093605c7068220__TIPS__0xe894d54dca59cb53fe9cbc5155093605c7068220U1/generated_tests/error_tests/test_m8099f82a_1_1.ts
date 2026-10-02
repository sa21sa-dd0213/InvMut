import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant test - m8099f82a", function () {
  it("should revert when loop index equals array length (i <= _tos.length)", async function () {
    const [owner, from, recipient] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a token address (we'll use a simple mock or EOA - the test just needs the call to revert)
    const tokenAddress = recipient.address; // Using an EOA as the token contract will cause the call to fail, but the revert happens before that due to out-of-bounds

    // Create array with exactly ONE recipient
    const recipients = [recipient.address];
    const value = 1;
    const decimals = 18;

    // The original would succeed (i < 1, loop runs once)
    // The mutant (i <= 1) will try to access index 1 of a 1-element array and revert
    await expect(
      instance.transfer(from.address, tokenAddress, recipients, value, decimals)
    ).to.be.reverted;
  });
});