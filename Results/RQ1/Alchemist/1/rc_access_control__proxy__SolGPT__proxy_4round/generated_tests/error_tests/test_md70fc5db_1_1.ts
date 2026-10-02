import { expect } from "chai";
import { ethers } from "hardhat";

describe("Proxy reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when forwarding to a non-existent contract (mutant removes require check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Proxy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-existent contract address (no code at this address)
    const nonExistentAddress = "0x0000000000000000000000000000000000000001";

    // The call will succeed (no revert) on the mutant because require(_s) is removed
    // The original would revert because call to non-existent address returns false
    // We expect the transaction to revert on the original, but pass on mutant
    // To kill the mutant, we assert that the call reverts (which only happens on original)
    await expect(
      instance.connect(owner).forward(nonExistentAddress, "0x")
    ).to.be.reverted;
  });
});