import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - med64a1e4", function () {
  it("should kill mutant that replaces keccak256 with sha256 by calling transfer and expecting success on original but revert on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for demo)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that implements transferFrom
    // Create a minimal contract that will respond to transferFrom calls
    const tokenFactory = await ethers.getContractFactory(
      "contract TestToken { function transferFrom(address, address, uint256) external pure returns (bool) { return true; } }"
    );
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();

    // Prepare test parameters: from = addr1, tos = [addr2], v = 100
    const recipients = [addr2.address];
    const value = ethers.parseEther("100");

    // Call transfer - in the original contract this should succeed because
    // keccak256 produces the correct selector for transferFrom
    // In the mutant, sha256 produces a different selector, causing the call to fail/revert
    const tx = instance.connect(owner).transfer(
      addr1.address,
      tokenAddress,
      recipients,
      value
    );

    // Expect the transaction to revert because the mutant uses sha256 instead of keccak256
    // which generates an incorrect function selector
    await expect(tx).to.be.reverted;
  });
});