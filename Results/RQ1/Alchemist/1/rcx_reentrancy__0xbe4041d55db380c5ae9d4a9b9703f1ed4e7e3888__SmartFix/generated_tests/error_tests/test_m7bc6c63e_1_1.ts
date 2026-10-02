import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection test", function () {
  it("should detect mutant m7bc6c63e by verifying SetMinSum reverts after initialization", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract - no constructor arguments needed
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First set MinSum to a known value
    const initialMinSum = ethers.parseEther("1");
    await instance.SetMinSum(initialMinSum);

    // Verify initial value was set
    expect(await instance.MinSum()).to.equal(initialMinSum);

    // Initialize the contract (lock configuration)
    await instance.Initialized();

    // Now try to call SetMinSum after initialization
    // Original should revert, mutant will not revert
    const newMinSum = ethers.parseEther("2");
    await expect(
      instance.SetMinSum(newMinSum)
    ).to.be.reverted;

    // After the call (if it didn't revert), verify MinSum stayed the same
    // This assertion will fail on the mutant where MinSum was changed
    expect(await instance.MinSum()).to.equal(initialMinSum);
  });
});